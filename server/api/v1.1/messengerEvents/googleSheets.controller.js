const logger = require('../../../components/logger')
const TAG = 'api/messengerEvents/customFieldsController.controller.js'
const {callApi} = require('../utility')
const async = require('async')
const {google} = require('googleapis')
var sheets = google.sheets('v4')

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
                    if (resp.googleSheetAction === 'insert_row') {
                      insertRow(resp, subscriber, integration)
                    } else if (resp.googleSheetAction === 'get_row_by_value') {
                      getRowByValue(resp, subscriber, integration)
                    } else if (resp.googleSheetAction === 'update_row') {
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
function insertRow (resp, subscriber, integration) {
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
        range: 'A1',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          'majorDimension': 'ROWS',
          'range': 'A1',
          'values': dataToSend
        },
        auth: integration.integrationToken
      }
      sheets.spreadsheets.values.append(request, function (err, response) {
        if (err) {
          logger.serverLog(TAG, `Failed to insert row ${JSON.stringify(err)}`, 'error')
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
  }
}
function getRowByValue (resp, subscriber, integration) {
  let request = {
    // The spreadsheet to request.
    spreadsheetId: resp.spreadSheet,
    ranges: [],
    includeGridData: true,
    auth: integration.integrationToken
  }
  sheets.spreadsheets.get(request, function (err, response) {
    if (err) {
      logger.serverLog(TAG, `Failed to fetch google sheets data ${JSON.stringify(err)}`, 'error')
    } else {
      let sheet = response.sheets.filter(sheet => sheet.properties.sheetId === resp.worksheet)[0]
      if (sheet) {

      }
    }
  })
}