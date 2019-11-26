/**
 * Created by sojharo on 27/07/2017.
 */

// controllers and install logic to go here
const {google} = require('googleapis')
var sheets = google.sheets('v4')
const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'sheetsIntegration.controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
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
