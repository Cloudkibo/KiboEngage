const logger = require('../../../components/logger')
const TAG = 'api/messengerEvents/hubspotController.controller.js'
const {callApi} = require('../utility')
const config = require('./../../../config/environment')
const async = require('async')

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
              callApi(`integrations/query`, 'post', { companyId: subscriber.companyId, integrationName: 'Hubspot' })
                .then(integration => {
                  integration = integration[0]
                  if (integration && integration.enabled) {
                    if (resp.hubspotAction === 'submit_form') {
                      submitForm(resp, subscriber)
                    } else if (resp.hubspotAction === 'insert_contact') {
                      // performGoogleSheetAction(resp.googleSheetAction, resp, subscriber, oauth2Client)
                    } else if (resp.hubspotAction === 'update_contact') {
                      // performGoogleSheetAction(resp.googleSheetAction, resp, subscriber, oauth2Client)
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

function submitForm (resp, subscriber, oauth2Client) {
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
