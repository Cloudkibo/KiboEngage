/**
 * Created by sojharo on 27/07/2017.
 */
const logger = require('../../../components/logger')
const TAG = 'api/sheetsIntegration/sheetsIntegration.controller.js'
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const dataLayer = require('./sheetsIntegration.datalayer')
const {google} = require('googleapis')
const config = require('./../../../config/environment')

// controllers and install logic to go here
var sheets = google.sheets('v4')
const { callApi } = require('../utility')
const async = require('async')

exports.fetchWorksheets = function (req, res) {
  callApi(`integrations/query`, 'post', {companyId: req.user.companyId, integrationName: 'Google Sheets'}, 'accounts', req.headers.authorization)
    .then(integration => {
      integration = integration[0]
      let request = {
        // The spreadsheet to request.
        spreadsheetId: req.body.spreadsheetId,
        ranges: [],
        includeGridData: false,
        auth: integration.integrationToken
      }
      sheets.spreadsheets.get(request, function (err, response) {
        if (err) {
          sendErrorResponse(res, 500, '', `Failed to fetch integrations ${err}`)
        } else {
          let dataToSend = []
          for (let i = 0; i < response.sheets.length; i++) {
            dataToSend.push({sheetId: response.sheets[i].properties.sheetId, title: response.sheets[i].properties.title})
          }
          if (dataToSend.length === response.sheets.length) {
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
  async.parallelLimit([
    function (callback) {
      callApi('custom_fields/query', 'post', { purpose: 'findAll', match: { companyId: req.user.companyId } })
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
          let request = {
            // The spreadsheet to request.
            spreadsheetId: req.body.spreadsheetId,
            ranges: [],
            includeGridData: false,
            auth: integration.integrationToken
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
        kiboPushColumns: [],
        customFieldColumns: [],
        googleSheetColumns: []
      }
      let customFields = results[0]
      let googleData = results[1]
      populateKiboPushColumns(dataToSend)
        .then(dataToSend => {
          populateCustomFieldColumns(dataToSend, customFields)
            .then(dataToSend => {
              populateGoogleColumns(dataToSend, googleData, req.bodt.sheetId)
                .then(dataToSend => {
                  sendSuccessResponse(res, 200, dataToSend)
                })
            })
        })
    }
  })
}

function populateKiboPushColumns (dataToSend) {
  return new Promise(function (resolve, reject) {
    dataToSend.kiboPushColumns.push({fieldName: 'firstName', title: 'First Name'})
    dataToSend.kiboPushColumns.push({fieldName: 'lastName', title: 'Last Name'})
    dataToSend.kiboPushColumns.push({fieldName: 'fullName', title: 'Full Name'})
    dataToSend.kiboPushColumns.push({fieldName: 'locale', title: 'Locale'})
    dataToSend.kiboPushColumns.push({fieldName: 'timezone', title: 'Timezone'})
    dataToSend.kiboPushColumns.push({fieldName: 'email', title: 'Email'})
    dataToSend.kiboPushColumns.push({fieldName: 'gender', title: 'Gender'})
    dataToSend.kiboPushColumns.push({fieldName: 'profilePic', title: 'Profile Pic'})
    dataToSend.kiboPushColumns.push({fieldName: 'phoneNumber', title: 'Phone Number'})
    dataToSend.kiboPushColumns.push({fieldName: 'isSubscribed', title: 'Subscribed'})
    dataToSend.kiboPushColumns.push({fieldName: 'last_activity_time', title: 'Last Interaction'})
    dataToSend.kiboPushColumns.push({fieldName: 'lastMessagedAt', title: 'Last User Interaction'})
    dataToSend.kiboPushColumns.push({fieldName: 'datetime', title: 'Subcription Date'})
    resolve(dataToSend)
  })
}
function populateCustomFieldColumns (dataToSend, customFields) {
  return new Promise(function (resolve, reject) {
    if (customFields && customFields.length > 0) {
      for (let i = 0; i < customFields.length; i++) {
        dataToSend.customFieldColumns.push({customFieldId: customFields[i]._id, title: customFields[i].name})
        if (i === customFields.length - 1) {
          resolve(dataToSend)
        }
      }
    } else {
      resolve(dataToSend)
    }
  })
}
function populateGoogleColumns (dataToSend, googleData, sheetId) {
  return new Promise(function (resolve, reject) {
    let sheet = googleData.sheets.filter(sheet => sheet.properties.sheetId === sheetId)[0]
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
  listMajors(oauth2Client)

  let userId = req.cookies.userid
  dataLayer.fetchUserCompany(userId)
    .then(companyUser => {
      if (companyUser) {
        let companyId = companyUser.companyId
        dataLayer.index({
          companyId,
          userId,
          integrationName: 'Google Sheets'
        })
          .then(integrations => {
            if (integrations.length > 0) {
              let newPayload = {
                companyId: integrations[0].companyId,
                userId: integrations[0].userId,
                integrationName: integrations[0].integrationName,
                integrationToken: tokens.access_token,
                integrationPayload: tokens,
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
                integrationName: 'Google Sheets',
                integrationToken: tokens.access_token,
                integrationPayload: tokens,
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
      } else {
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
        // const {tokens} = await oauth2Client.getToken(integrations[0].integrationToken)
        oauth2Client.setCredentials(integrations[0].integrationPayload.refresh_token)
        const service = google.drive('v3', oauth2Client)
        service.files.list(
          {
            q: "mimeType='application/vnd.google-apps.spreadsheet'",
            fields: 'nextPageToken, files(id, name)',
            spaces: 'drive',
            pageToken: null
          },
          (err, response) => {
            console.log('sheets fetch response', response)
            if (err) {
              console.log('sheets fetch error', err)
              return sendErrorResponse(res, 404, err, 'No integrations defined. Please enabled from settings.')
            }
            const files = response.data.files
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

function listMajors (auth) {
  const sheets = google.sheets('v4')
  sheets.spreadsheets.values.get(
    {
      auth: auth,
      spreadsheetId: '1KO4Z683all-pThxpJ95fLok_ZHqhkVIHHwiR9cuvGvs',
      range: 'A1'
    },
    (err, res) => {
      if (err) {
        console.error('The API returned an error.')
        throw err
      }
      const rows = res.data.values
      if (rows.length === 0) {
        console.log('No data found.')
      } else {
        console.log('Name, Major:')
        for (const row of rows) {
          // Print columns A and E, which correspond to indices 0 and 4.
          console.log(`${row[0]}, ${row[4]}`)
        }
      }
    }
  )
}