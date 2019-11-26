/**
 * Created by sojharo on 27/07/2017.
 */
const logger = require('../../../components/logger')
const TAG = 'api/sheetsIntegration/sheetsIntegration.controller.js'
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const dataLayer = require('./sheetsIntegration.datalayer')
const {google} = require('googleapis')
const config = require('./../../../config/environment')
const oauth2Client = new google.auth.OAuth2(
  config.google.client_id,
  config.google.client_secret,
  config.google.callbackURL
)

exports.auth = function (req, res) {
  const url = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: 'offline',

    // If you only need one scope you can pass it as a string
    scope: config.google.scopes
  })
  res.cookie('sheetsCompanyId', req.user.companyId)
  res.redirect(url)
}

exports.callback = async function (req, res) {
  let code = req.query.code

  const {tokens} = await oauth2Client.getToken(code)
  oauth2Client.setCredentials(tokens)

  let userId = req.cookies.userid
  let companyId = req.cookies.sheetsCompanyId
  res.clearCookie('sheetsCompanyId')
  dataLayer.index({
    companyId,
    userId,
    integrationName: 'google'
  })
    .then(integrations => {
      if (integrations.length > 0) {
        let newPayload = {
          companyId: integrations[0].companyId,
          userId: integrations[0].userId,
          integrationName: integrations[0].integrationName,
          integrationToken: tokens,
          enabled: true
        }
        dataLayer.update(integrations[0]._id, newPayload)
          .then(updated => {
            res.redirect('/')
          })
          .catch(err => {
            logger.serverLog(TAG, 'Error in Integrations Sheets callback' + JSON.stringify(err), 'error')
            res.status(500).send('Internal Error Occurred.')
          })
      } else {
        let payload = {
          companyId,
          userId,
          integrationName: 'google',
          integrationToken: tokens,
          enabled: true
        }
        dataLayer.create(payload)
          .then(created => {
            res.redirect('/')
          })
          .catch(err => {
            logger.serverLog(TAG, 'Error in Integrations Sheets callback' + JSON.stringify(err), 'error')
            res.status(500).send('Internal Error Occurred.')
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, 'Error in Integrations Sheets callback' + JSON.stringify(err), 'error')
      res.status(500).send('Internal Error Occurred.')
    })
}

exports.listSpreadSheets = (req, res) => {
  dataLayer.index({
    companyId: req.user.companyId,
    userId: req.user._id,
    integrationName: 'google'
  })
    .then(async function (integrations) {
      if (integrations.length > 0) {
        const {tokens} = await oauth2Client.getToken(integrations[0].integrationToken)
        oauth2Client.setCredentials(tokens)
        const service = google.drive('v3', oauth2Client)
        service.files.list(
          {
            q: "mimeType='application/vnd.google-apps.spreadsheet'",
            fields: 'nextPageToken, files(id, name)'
          },
          (err, res) => {
            if (err) {
              sendErrorResponse(res, 404, JSON.stringify(err), 'No integrations defined. Please enabled from settings.')
            }
            const files = res.data.files
            if (files.length === 0) {
              sendSuccessResponse(res, 200, files, 'Zero files found')
            } else {
              sendSuccessResponse(res, 200, files, 'SpreadSheet files found')
              for (const file of files) {
                logger.serverLog(TAG, `Spreadsheet file ${file.name} (${file.id})`)
              }
            }
          }
        )
      } else {
        sendErrorResponse(res, 404, null, 'No integrations defined. Please enabled from settings.')
      }
    })
}
