const logger = require('../../../components/logger')
const TAG = 'api/messengerEvents/googleSheetsController.controller.js'
const {callApi} = require('../utility')
const async = require('async')
const {google} = require('googleapis')
var sheets = google.sheets('v4')
const config = require('./../../../config/environment')
const datalayer = require('./googleSheets.datalayer')
const { getLookUpValue, getDataForSubscriberValues } = require('./../../global/externalIntegrations')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let resp
  if (req.body.entry[0].messaging[0].message && req.body.entry[0].messaging[0].message.quick_reply) {
    resp = JSON.parse(req.body.entry[0].messaging[0].message.quick_reply.payload)
  } else {
    resp = JSON.parse(req.body.entry[0].messaging[0].postback.payload)
  }
  const sender = req.body.entry[0].messaging[0].sender.id
  const pageId = req.body.entry[0].messaging[0].recipient.id
  callApi(`pages/query`, 'post', { pageId: pageId, connected: true })
    .then(page => {
      page = page[0]
      if (page) {
        callApi(`subscribers/query`, 'post', { pageId: page._id, senderId: sender, companyId: page.companyId })
          .then(subscriber => {
            subscriber = subscriber[0]
            if (subscriber) {
              callApi(`integrations/query`, 'post', { companyId: subscriber.companyId, integrationName: 'Google Sheets' })
                .then(integration => {
                  integration = integration[0]
                  if (integration && integration.enabled) {
                    const oauth2Client = new google.auth.OAuth2(
                      config.google.client_id,
                      config.google.client_secret,
                      config.google.callbackURL
                    )
                    oauth2Client.credentials = integration.integrationPayload
                    if (resp.googleSheetAction === 'insert_row') {
                      insertRow(resp, subscriber, oauth2Client)
                    } else {
                      performGoogleSheetAction(resp.googleSheetAction, resp, subscriber, oauth2Client)
                    }
                  }
                })
                .catch(err => {
                  const message = err || 'Failed to fetch integrations'
                  logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
                })
            }
          })
          .catch(err => {
            const message = err || 'Failed to fetch subscriber'
            logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
          })
      }
    })
    .catch(err => {
      const message = err || 'Failed to fetch page'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
    })
}

function insertRow (resp, subscriber, oauth2Client) {
  async.eachOf(resp.mapping, function (item, index, cb) {
    let data = {
      mapping: resp.mapping,
      item,
      index,
      subscriber
    }
    getDataForSubscriberValues(data, cb)
  }, function (err) {
    if (err) {
      const message = err || 'Failed to fetch data to send'
      logger.serverLog(message, `${TAG}: insertRow`, {resp, subscriber}, {}, 'error')
    } else {
      let data = resp.mapping.map(item => item.value)
      let dataToSend = [data]
      let request = {
        spreadsheetId: resp.spreadSheet,
        range: resp.worksheetName,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          'majorDimension': 'ROWS',
          'range': resp.worksheetName,
          'values': dataToSend
        },
        auth: oauth2Client
      }
      sheets.spreadsheets.values.append(request, function (err, response) {
        if (err) {
          const message = err || 'Failed to insert row'
          logger.serverLog(message, `${TAG}: insertRow`, {resp, subscriber}, {}, 'error')
        }
      })
    }
  })
}

function performGoogleSheetAction (type, resp, subscriber, oauth2Client) {
  getLookUpValue(resp.lookUpValue, subscriber)
    .then(lookUpValue => {
      if (lookUpValue !== '') {
        var request = {
          spreadsheetId: resp.spreadSheet,
          range: resp.worksheetName,
          majorDimension: 'COLUMNS',
          auth: oauth2Client
        }
        sheets.spreadsheets.values.get(request, function (err, response) {
          if (err) {
            const message = err || 'Failed to fetch google sheets data'
            logger.serverLog(message, `${TAG}: performGoogleSheetAction`, {type, resp, subscriber}, {}, 'error')
          } else {
            let range = getLookUpRange(resp.lookUpColumn, lookUpValue, response.data.values)
            if (range) {
              if (type === 'get_row_by_value') {
                getRowByValue(resp, subscriber, range, response.data.values)
              } else if (type === 'update_row') {
                updateRow(resp, subscriber, oauth2Client, range)
              }
            } else {
              if (type === 'update_row') {
                for (let i = 0; i < resp.mapping.length; i++) {
                  if (resp.lookUpColumn === resp.mapping[i].googleSheetColumn) {
                    if (!resp.mapping[i].kiboPushColumn && !resp.mapping[i].customFieldColumn) {
                      if (subscriber[resp.lookUpValue] || resp.lookUpValue === 'fullName') {
                        resp.mapping[i].kiboPushColumn = resp.lookUpValue
                      } else {
                        resp.mapping[i].customFieldColumn = resp.lookUpValue
                      }
                    }
                  }
                }
                insertRow(resp, subscriber, oauth2Client)
              }
            }
          }
        })
      }
    })
}

function getRowByValue (resp, subscriber, cellAddress, sheetData) {
  let newSubscriberPayload = {}
  for (let i = 0; i < resp.mapping.length; i++) {
    let { kiboPushColumn, googleSheetColumn, customFieldColumn } = resp.mapping[i]
    if (kiboPushColumn) {
      for (let j = 0; j < sheetData.length; j++) {
        if (googleSheetColumn === sheetData[j][0]) {
          let newData = sheetData[j][cellAddress.j]
          newSubscriberPayload[kiboPushColumn] = newData
        }
      }
    } else if (customFieldColumn) {
      for (let j = 0; j < sheetData.length; j++) {
        if (googleSheetColumn === sheetData[j][0]) {
          let newData = sheetData[j][cellAddress.j]
          if (newData && newData !== '') {
            datalayer.genericUpdate({ customFieldId: customFieldColumn, subscriberId: subscriber._id },
              { value: newData },
              { upsert: true }
            )
          }
        }
      }
    }
  }
  if (Object.keys(newSubscriberPayload).length > 0) {
    callApi(`subscribers/update`, 'put', {query: {_id: subscriber._id}, newPayload: newSubscriberPayload, options: {}})
      .then(updated => {
      })
      .catch(err => {
        const message = err || 'Failed to udpate subscriber'
        logger.serverLog(message, `${TAG}: getRowByValue`, {resp, subscriber}, {}, 'error')
      })
  }
}

function updateRow (resp, subscriber, oauth2Client, range) {
  async.eachOf(resp.mapping, function (item, index, cb) {
    let data = {
      mapping: resp.mapping,
      item,
      index,
      subscriber
    }
    getDataForSubscriberValues(data, cb)
  }, function (err) {
    if (err) {
      const message = err || 'Failed to fetch data to send'
      logger.serverLog(message, `${TAG}: updateRow`, {resp, subscriber}, {}, 'error')
    } else {
      let data = resp.mapping.map(item => item.value)
      let dataToSend = [data]
      let request = {
        spreadsheetId: resp.spreadSheet,
        range: `${resp.worksheetName}!A${range.j + 1}`,
        valueInputOption: 'RAW',
        resource: {
          'majorDimension': 'ROWS',
          'range': `${resp.worksheetName}!A${range.j + 1}`,
          'values': dataToSend
        },
        auth: oauth2Client
      }
      sheets.spreadsheets.values.update(request, function (err, response) {
        if (err) {
          const message = err || 'Failed to insert row'
          logger.serverLog(message, `${TAG}: updateRow`, {resp, subscriber}, {}, 'error')
        }
      })
    }
  })
}

// Getting look up value from Google sheets
function getLookUpRange (lookUpColumn, lookUpValue, data) {
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === lookUpColumn) {
      for (let j = 0; j < data[i].length; j++) {
        if (typeof lookUpValue === 'string') {
          let lookUpDateInEpoch = Date.parse(lookUpValue)
          if (isNaN(lookUpDateInEpoch)) {
            if (data[i][j].toLowerCase() === lookUpValue.toLowerCase()) {
              return {i, j}
            }
          } else {
            let mongoDBDate = new Date(lookUpValue)
            let sheetDate = new Date(data[i][j])
            mongoDBDate.setHours(0, 0, 0, 0)
            sheetDate.setHours(0, 0, 0, 0)
            if (mongoDBDate.valueOf() === sheetDate.valueOf()) {
              return {i, j}
            }
          }
        } else if (typeof lookUpValue === 'boolean') {
          if (data[i][j].toLowerCase() === lookUpValue.toString().toLowerCase()) {
            return {i, j}
          }
        } else if (typeof lookUpValue === 'number') {
          if (data[i][j] === lookUpValue.toString()) {
            return {i, j}
          }
        }
      }
    }
  }
}
exports.getLookUpRange = getLookUpRange
