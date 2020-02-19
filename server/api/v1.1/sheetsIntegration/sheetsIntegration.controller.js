/**
 * Created by sojharo on 27/07/2017.
 */
const logger = require('../../../components/logger')
const TAG = 'api/sheetsIntegration/sheetsIntegration.controller.js'
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const dataLayer = require('./sheetsIntegration.datalayer')
const {google} = require('googleapis')
const config = require('./../../../config/environment')
const {
  populateKiboPushColumns,
  populateCustomFieldColumns
} = require('./../../global/externalIntegrations')

// controllers and install logic to go here
var sheets = google.sheets('v4')
const { callApi } = require('../utility')
const async = require('async')

exports.fetchWorksheets = function (req, res) {
  const oauth2Client = new google.auth.OAuth2(
    config.google.client_id,
    config.google.client_secret,
    config.google.callbackURL
  )
  callApi(`integrations/query`, 'post', {companyId: req.user.companyId, integrationName: 'Google Sheets'}, 'accounts', req.headers.authorization)
    .then(integration => {
      integration = integration[0]
      integration.integrationPayload.refresh_token = integration.integrationToken
      oauth2Client.credentials = integration.integrationPayload
      let request = {
        // The spreadsheet to request.
        spreadsheetId: req.body.spreadsheetId,
        ranges: [],
        includeGridData: true,
        auth: oauth2Client
      }
      sheets.spreadsheets.get(request, function (err, response) {
        if (err) {
          sendErrorResponse(res, 500, '', `Failed to fetch integrations ${err}`)
        } else {
          let dataToSend = []
          for (let i = 0; i < response.data.sheets.length; i++) {
            dataToSend.push({sheetId: response.data.sheets[i].properties.sheetId, title: response.data.sheets[i].properties.title})
          }
          if (dataToSend.length === response.data.sheets.length) {
            sendSuccessResponse(res, 200, dataToSend)
          }
        }
      })
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Failed to fetch integrations ${err}`)
    })
}
exports.fetchColumns = function (req, res) {
  const oauth2Client = new google.auth.OAuth2(
    config.google.client_id,
    config.google.client_secret,
    config.google.callbackURL
  )
  return new Promise((resolve, reject) => {
    async.parallelLimit([
      function (callback) {
        callApi('custom_fields/query', 'post', { purpose: 'findAll', match: { $or: [{companyId: req.user.companyId}, {default: true}] } })
          .then(customFields => {
            callback(null, customFields)
          })
          .catch(err => {
            callback(err)
          })
      },
      function (callback) {
        callApi(`integrations/query`, 'post', {companyId: req.user.companyId, integrationName: 'Google Sheets'}, 'accounts', req.headers.authorization)
          .then(integration => {
            integration = integration[0]
            integration.integrationPayload.refresh_token = integration.integrationToken
            oauth2Client.credentials = integration.integrationPayload
            let request = {
              // The spreadsheet to request.
              spreadsheetId: req.body.spreadsheetId,
              ranges: [],
              includeGridData: true,
              auth: oauth2Client
            }
            sheets.spreadsheets.get(request, function (err, response) {
              if (err) {
                callback(err)
              } else {
                callback(null, response)
              }
            })
          })
          .catch(err => {
            sendErrorResponse(res, 500, '', `Failed to fetch integrations ${err}`)
          })
      }
    ], 10, function (err, results) {
      if (err) {
        sendErrorResponse(res, 500, '', `Failed to fetch columns ${err}`)
      } else {
        let dataToSend = {
          kiboPushColumns: populateKiboPushColumns(),
          customFieldColumns: [],
          googleSheetColumns: []
        }
        let customFields = results[0]
        let googleData = results[1].data
        populateCustomFieldColumns(dataToSend, customFields)
          .then(dataToSend => {
            populateGoogleColumns(dataToSend, googleData, req.body.sheetId)
              .then(dataToSend => {
                let googleSheetcolumns = dataToSend.googleSheetColumns.filter(column => column !== null)
                dataToSend.googleSheetColumns = googleSheetcolumns
                logger.serverLog(TAG, `dataToSend.googleSheetColumns ${JSON.stringify(dataToSend.googleSheetColumns)}`)
                if (req.body.user_input) {
                  resolve(dataToSend)
                } else {
                  sendSuccessResponse(res, 200, dataToSend)
                }
              })
          })
      }
    })
  })
}

function populateGoogleColumns (dataToSend, googleData, sheetId) {
  return new Promise(function (resolve, reject) {
    let sheet = googleData.sheets.filter(sheet => sheet.properties.sheetId.toString() === sheetId)[0]
    if (sheet) {
      if (sheet.data.length > 0 && sheet.data[0].rowData.length > 0) {
        for (let i = 0; i < sheet.data[0].rowData[0].values.length; i++) {
          dataToSend.googleSheetColumns.push(sheet.data[0].rowData[0].values[i].formattedValue)
          if (i === sheet.data[0].rowData[0].values.length - 1) {
            resolve(dataToSend)
          }
        }
      } else {
        resolve(dataToSend)
      }
    } else {
      resolve(dataToSend)
    }
  })
}
exports.auth = function (req, res) {
  const oauth2Client = new google.auth.OAuth2(
    config.google.client_id,
    config.google.client_secret,
    config.google.callbackURL
  )

  const url = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: 'offline',

    // If you only need one scope you can pass it as a string
    scope: config.google.scopes
  })
  res.redirect(url)
}

exports.callback = async function (req, res) {
  let code = req.query.code

  const oauth2Client = new google.auth.OAuth2(
    config.google.client_id,
    config.google.client_secret,
    config.google.callbackURL
  )

  const {tokens} = await oauth2Client.getToken(code)
  oauth2Client.credentials = tokens

  let userId = req.cookies.userid
  dataLayer.fetchUserCompany(userId)
    .then(companyUser => {
      if (companyUser) {
        let companyId = companyUser.companyId
        dataLayer.index({ companyId, userId, integrationName: 'Google Sheets' })
          .then(integrations => {
            if (integrations.length > 0) {
              tokens.refresh_token = tokens.refresh_token || integrations[0].integrationPayload.refresh_token
              let newPayload = {
                companyId: integrations[0].companyId,
                userId: integrations[0].userId,
                integrationName: integrations[0].integrationName,
                integrationToken: tokens.refresh_token,
                integrationPayload: tokens,
                enabled: true
              }
              dataLayer.update(integrations[0]._id, newPayload)
                .then(updated => {
                  res.redirect('/successMessage')
                })
                .catch(err => {
                  res.redirect('/ErrorMessage')
                  logger.serverLog(TAG, 'Error in Integrations Sheets on update callback' + err, 'error')
                  res.status(500).send('Internal Error Occurred.')
                })
            } else {
              let payload = {
                companyId,
                userId,
                integrationName: 'Google Sheets',
                integrationToken: tokens.refresh_token,
                integrationPayload: tokens,
                enabled: true
              }
              dataLayer.create(payload)
                .then(created => {
                  res.redirect('/successMessage')
                })
                .catch(err => {
                  res.redirect('/ErrorMessage')
                  logger.serverLog(TAG, 'Error in Integrations Sheets on create callback' + err, 'error')
                  res.status(500).send('Internal Error Occurred.')
                })
            }
          })
          .catch(err => {
            res.redirect('/ErrorMessage')
            logger.serverLog(TAG, 'Error in Integrations Sheets on fetch callback' + err, 'error')
            res.status(500).send('Internal Error Occurred.')
          })
      } else {
        res.redirect('/ErrorMessage')
        res.status(500).send('Internal Error Occurred. Invalid user')
      }
    })
}

exports.listSpreadSheets = (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    config.google.client_id,
    config.google.client_secret,
    config.google.callbackURL
  )

  dataLayer.index({
    companyId: req.user.companyId,
    userId: req.user._id,
    integrationName: 'Google Sheets'
  })
    .then(function (integrations) {
      if (integrations.length > 0) {
        integrations[0].integrationPayload.refresh_token = integrations[0].integrationToken
        oauth2Client.credentials = integrations[0].integrationPayload
        const service = google.drive('v3')
        service.files.list(
          {
            auth: oauth2Client,
            q: "mimeType='application/vnd.google-apps.spreadsheet'",
            fields: 'nextPageToken, files(id, name)',
            spaces: 'drive',
            pageToken: null
          },
          (err, response) => {
            if (err) {
              return sendErrorResponse(res, 404, err, 'No integrations defined. Please enabled from settings.')
            }
            const files = response.data.files
            if (files.length === 0) {
              sendSuccessResponse(res, 200, files, 'Zero files found')
            } else {
              sendSuccessResponse(res, 200, files, 'SpreadSheet files of connected user')
            }
          }
        )
      } else {
        sendErrorResponse(res, 404, null, 'No integrations defined. Please enabled from settings.')
      }
    })
}
