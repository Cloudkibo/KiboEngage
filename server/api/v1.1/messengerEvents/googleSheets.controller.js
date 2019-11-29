const logger = require('../../../components/logger')
const TAG = 'api/messengerEvents/customFieldsController.controller.js'
const {callApi} = require('../utility')
const async = require('async')
const {google} = require('googleapis')
var sheets = google.sheets('v4')
const config = require('./../../../config/environment')

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
                  if (integration) {
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
                  logger.serverLog(TAG, `Failed to fetch integrations ${err}`, 'error')
                })
            }
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to fetch subscriber ${err}`, 'error')
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`, 'error')
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
    _getDataForInsertRow(data, cb)
  }, function (err) {
    if (err) {
      logger.serverLog(TAG, `Failed to fetch data to send ${JSON.stringify(err)}`, 'error')
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
          logger.serverLog(TAG, `Failed to insert row ${JSON.stringify(err)}`, 'error')
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
            logger.serverLog(TAG, `Failed to fetch google sheets data ${JSON.stringify(err)}`, 'error')
          } else {
            let range = getLookUpRange(resp.lookUpColumn, lookUpValue, response.data.values)
            if (range) {
              if (type === 'get_row_by_value') {
                getRowByValue(resp, subscriber, range, response.data.values)
              } else if (type === 'update_row') {
                updateRow(resp, subscriber, oauth2Client, range)
              }
            }
          }
        })
      }
    })
}

function _getDataForInsertRow (data, callback) {
  const { index, item, subscriber, mapping } = data
  if (item.kiboPushColumn) {
    if (subscriber[item.kiboPushColumn]) {
      mapping[index]['value'] = subscriber[item.kiboPushColumn]
      callback()
    } else {
      mapping[index]['value'] = ''
      callback()
    }
  } else if (item.customFieldColumn) {
    callApi(
      'custom_field_subscribers/query',
      'post',
      {
        purpose: 'findOne',
        match: { customFieldId: item.customFieldColumn, subscriberId: subscriber._id }
      }
    )
      .then(customFieldSubscriber => {
        if (customFieldSubscriber) {
          mapping[index]['value'] = customFieldSubscriber.value
          callback()
        } else {
          mapping[index]['value'] = ''
          callback()
        }
      })
      .catch(err => {
        logger.serverLog(TAG, `Failed to fetch custom field subscriber ${JSON.stringify(err)}`, 'error')
        callback(err)
      })
  } else {
    callback()
  }
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
            let updatePayload = { purpose: 'updateOne', match: { customFieldId: customFieldColumn, subscriberId: subscriber._id }, updated: { value: newData } }
            callApi('custom_field_subscribers/', 'put', updatePayload)
              .then(updated => {
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to update custom field value ${JSON.stringify(err)}`, 'error')
              })
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
        logger.serverLog(TAG, `Failed to udpate subscriber ${JSON.stringify(err)}`, 'error')
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
    _getDataForInsertRow(data, cb)
  }, function (err) {
    if (err) {
      logger.serverLog(TAG, `Failed to fetch data to send ${JSON.stringify(err)}`, 'error')
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
          logger.serverLog(TAG, `Failed to insert row ${JSON.stringify(err)}`, 'error')
        }
      })
    }
  })
}

// Getting look up value from Google Sheet
function getLookUpValue (lookUpValue, subscriber) {
  return new Promise(function (resolve, reject) {
    if (lookUpValue.match(/^[0-9a-fA-F]{24}$/)) {
      callApi(
        'custom_field_subscribers/query',
        'post',
        {
          purpose: 'findOne',
          match: { customFieldId: lookUpValue, subscriberId: subscriber._id }
        }
      )
        .then(customFieldSubscriber => {
          if (customFieldSubscriber) {
            resolve(customFieldSubscriber.value)
          } else {
            resolve('')
          }
        })
        .catch((err) => {
          logger.serverLog(TAG, `Failed to fetch custom field subscriber ${JSON.stringify(err)}`, 'error')
          resolve('')
        })
    } else {
      if (subscriber[lookUpValue]) {
        lookUpValue = subscriber[lookUpValue]
        resolve(lookUpValue)
      } else {
        resolve('')
      }
    }
  })
}

// Getting look up value from System subscriber fields
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

function columnToLetter (column) {
  var temp = ''
  var letter = ''
  while (column > 0) {
    temp = (column - 1) % 26
    letter = String.fromCharCode(temp + 65) + letter
    column = (column - temp - 1) / 26
  }
  return letter
}
