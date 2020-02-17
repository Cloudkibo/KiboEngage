const {callApi} = require('../utility')
const broadcastDataLayer = require('../broadcasts/broadcasts.datalayer')
const TAG = 'api/messengerEvents/userInput.controller.js'
const logger = require('../../../components/logger')
const {sendUsingBatchAPI} = require('../../global/sendConversation')
const BroadcastPageDataLayer = require('../page_broadcast/page_broadcast.datalayer')
const {isEmailAddress, isWebURL, isNumber, isPhoneNumber} = require('../../global/utility')
const {setCustomFieldValue} = require('../custom_field_subscribers/custom_field_subscriber.controller')
const { refreshAuthToken, saveNewTokens, callHubspotApi } = require('./../hubspotIntegration/hubspotIntegration.controller')
const {defaultFieldcolumn} = require('../hubspotIntegration/hubspotDefaultFields')
const config = require('./../../../config/environment')
const {fetchColumns} = require('../sheetsIntegration/sheetsIntegration.controller')
const {google} = require('googleapis')
var sheets = google.sheets('v4')
const {getLookUpValue} = require('./../../global/externalIntegrations')
const {getLookUpRange} = require('./googleSheets.controller')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  if (req.body.message === 'userInputSkip') {
    const event = req.body.payload.entry[0].messaging[0]
    let message = event.message
    message.quick_reply.payload = JSON.parse(message.quick_reply.payload)
    const senderId = event.message && event.message.is_echo ? event.recipient.id : event.sender.id
    const pageId = event.message && event.message.is_echo ? event.sender.id : event.recipient.id
    callApi(`pages/query`, 'post', { pageId: pageId, connected: true }, 'accounts')
      .then(pages => {
        let page = pages[0]
        let payload = {
          senderId: senderId,
          pageId: page._id,
          isSubscribed: true,
          companyId: page.companyId
        }
        req.body.payload = payload
        req.body.message = message
        _sendNextMessage(req, res)
      }).catch(err => {
        logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`)
      })
  } else {
    _sendNextMessage(req, res)
  }
}

const _savePageBroadcast = (data) => {
  BroadcastPageDataLayer.createForBroadcastPage(data)
    .then(savedpagebroadcast => {
      require('../../global/messageStatistics').record('broadcast')
      logger.serverLog(TAG, 'page broadcast object saved in db')
    })
    .catch(error => {
      logger.serverLog(`Failed to create page_broadcast ${JSON.stringify(error)}`)
    })
}

const _checkTypeValidation = (payload, message) => {
  if (payload.type === 'text') {
    return message.text
  } else if (payload.type === 'email') {
    return isEmailAddress(message.text)
  } else if (payload.type === 'url') {
    return isWebURL(message.text.toLowerCase())
  } else if (payload.type === 'number') {
    return isNumber(message.text)
  } else if (payload.type === 'phoneNumber') {
    return isPhoneNumber(message.text)
  }
}

const _createValidationMessage = (message, skipButtonText) => {
  let data = [{
    text: message,
    componentType: 'text',
    quickReplies: [
      {
        'content_type': 'text',
        'title': skipButtonText,
        'payload': JSON.stringify(
          {
            option: 'userInputSkip'
          }
        )
      }
    ]
  }]
  return data
}

const _subscriberUpdate = (subscriber, waitingForUserInput) => {
  console.log('_subscriberUpdate', subscriber)
  callApi(`subscribers/update`, 'put', {query: {_id: subscriber.data[0]._id}, newPayload: {waitingForUserInput: waitingForUserInput}, options: {}})
    .then(updated => {
      logger.serverLog(TAG, `Succesfully updated subscriber`)
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to update subscriber ${JSON.stringify(err)}`)
    })
}

const _sendNextMessage = (req, res) => {
  callApi(`subscribers/query`, 'post', {pageId: req.body.payload.pageId, senderId: req.body.payload.senderId, companyId: req.body.payload.companyId})
    .then(sub => {
      let subscriber = {}
      subscriber.data = sub
      let waitingForUserInput = subscriber.data[0].waitingForUserInput
      broadcastDataLayer.findBroadcast({_id: waitingForUserInput.broadcastId, companyId: req.body.payload.companyId})
        .then(broadcast => {
          broadcast.broadcastId = broadcast._id
          let payload = broadcast.payload
          let broadcast_payload = payload[waitingForUserInput.componentIndex]
          if ((waitingForUserInput.componentIndex < payload.length - 1) || broadcast_payload.componentType === 'userInput') {
            callApi(`pages/query`, 'post', {_id: req.body.payload.pageId})
              .then(pages => {
                if (_checkTypeValidation(broadcast_payload, req.body.message) || req.body.message.quick_reply) {
                  logger.serverLog(TAG, `True _checkTypeValidation ${JSON.stringify(payload)}`)
                  if (!req.body.message.quick_reply) {
                    _saveData(req, res, broadcast_payload, sub, req.body.message, pages[0])
                  }
                  payload.splice(0, waitingForUserInput.componentIndex + 1)
                  if (payload.length === 0) {
                    waitingForUserInput.componentIndex = -1
                    _subscriberUpdate(subscriber, waitingForUserInput)
                  } else {
                    sendUsingBatchAPI('update_broadcast', payload, subscriber, pages[0], req.user, '', _savePageBroadcast, broadcast)
                  }
                } else {
                  if (waitingForUserInput.incorrectTries > 0) {
                    logger.serverLog(TAG, `False _checkTypeValidation`)
                    waitingForUserInput.incorrectTries = waitingForUserInput.incorrectTries - 1
                    _subscriberUpdate(subscriber, waitingForUserInput)
                    let validationMessage = _createValidationMessage(broadcast_payload.retryMessage, broadcast_payload.skipButtonText)
                    sendUsingBatchAPI('broadcast_message', validationMessage, subscriber, pages[0], req.user, '', _savePageBroadcast, broadcast)
                  } else {
                    waitingForUserInput.componentIndex = -1
                    _subscriberUpdate(subscriber, waitingForUserInput)
                  }
                }
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`)
              })
          } else {
            console.log('called function component index')
            waitingForUserInput.componentIndex = -1
            _subscriberUpdate(subscriber, waitingForUserInput)
          }
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch broadcast ${err}`, 'error')
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch subscriber ${err}`, 'error')
    })
}

const _saveData = (req, res, broadcastPayload, subscribers, message, page) => {
  if (broadcastPayload.action) {
    if (broadcastPayload.action.type === 'custom_fields') {
      _saveIntoCustomField(req, res, broadcastPayload, subscribers, message)
    } else if (broadcastPayload.action.type === 'hubspot') {
      _saveIntoHubspot(req, res, broadcastPayload, subscribers, message, page)
    } else if (broadcastPayload.action.type === 'google_sheets') {
      _saveIntoGoogleSheet(req, res, broadcastPayload, subscribers, message)
    }
  }
}

const _saveIntoCustomField = (req, res, broadcastPayload, subscribers, message) => {
  let user = {
    companyId: subscribers[0].companyId
  }
  req.user = user
  req.body.user_input = true
  req.body.customFieldId = broadcastPayload.action.customFieldId
  req.body.value = message.text
  req.body.subscriberIds = subscribers.map(subscriber => subscriber._id)
  setCustomFieldValue(req, res)
}

const _saveIntoHubspot = (req, res, broadcastPayload, subscribers, message, page) => {
  callApi(`integrations/query`, 'post', { companyId: subscribers[0].companyId, integrationName: 'Hubspot' })
    .then(integration => {
      integration = integration[0]
      if (integration && integration.enabled) {
        if (broadcastPayload.action.hubspotAction === 'submit_form') {
          _submitForm(broadcastPayload, subscribers, message, page, integration)
        } else if (broadcastPayload.action.hubspotAction === 'insert_update_contact') {
          _insertOrUpdateContact(broadcastPayload, subscribers, message, integration)
        }
      }
    }).catch(err => {
      logger.serverLog(TAG, `Failed to fetch integrations ${err}`, 'error')
    })
}

const _insertOrUpdateContact = (broadcastPayload, subscribers, message, integration) => {
  _getIdentityCustomFieldValue(broadcastPayload.action.identityFieldValue, subscribers[0])
    .then(customFieldValue => {
      let HubspotMappingColumns = defaultFieldcolumn.HubspotMappingColumns
      let data = [{property: HubspotMappingColumns[broadcastPayload.action.hubspotColumn], value: message.text}]
      let payload = {
        properties: data
      }
      let hubspotUrl = `https://api.hubapi.com/contacts/v1/contact/createOrUpdate/email/${customFieldValue}/`
      _sendToHubspot(integration, hubspotUrl, payload, 'post')
    }).catch((err) => {
      logger.serverLog(TAG, `Failed to fetch custom field subscriber for hubspot ${JSON.stringify(err)}`, 'error')
    })
}
const _submitForm = (broadcastPayload, subscribers, message, page, integration) => {
  let payload = {
    submittedAt: '' + Date.now(),
    fields: _createPayloadForm(broadcastPayload.action.hubspotColumn, subscribers, message.text),
    legalConsentOptions: { // Include this object when GDPR options are enabled
      consent: {
        consentToProcess: true,
        text: 'I agree to allow ' + page.pageName + ' to store and process my personal data.',
        communications: [
          {
            value: true,
            subscriptionTypeId: 999,
            text: 'I agree to receive marketing communications from ' + page.pageName + '.'
          }
        ]
      }
    }
  }
  let hubspotUrl = `https://api.hsforms.com/submissions/v3/integration/submit/${resp.portalId}/${resp.formId}`
  _sendToHubspot(integration, hubspotUrl, payload, 'post')
}

function _sendToHubspot (integration, hubspotUrl, payload, method) {
  console.log('sendToHubspot', payload)
  return new Promise((resolve, reject) => {
    let newTokens
    refreshAuthToken(integration.integrationPayload.refresh_token)
      .then(tokens => {
        newTokens = tokens
        return saveNewTokens(integration, tokens)
      })
      .then(updated => {
        return callHubspotApi(hubspotUrl, method, payload, newTokens.access_token)
      })
      .then(result => {
        resolve(result)
        logger.serverLog(TAG, `Success in sending data to hubspot form`)
      })
      .catch(err => {
        reject(err)
        logger.serverLog(TAG, `Failed to send data to hubspot form ${JSON.stringify(err)}`, 'error')
      })
  })
}

const _createPayloadForm = (huspotFieldName, subscribers, message) => {
  let allPayload = []
  let HubspotMappingColumns = defaultFieldcolumn.HubspotMappingColumns
  let payload = {
    name: 'email',
    value: subscribers[0].email
  }
  allPayload.push(payload)
  payload = {
    name: HubspotMappingColumns[huspotFieldName],
    value: message
  }
  allPayload.push(payload)
  return allPayload
}

function _getIdentityCustomFieldValue (lookUpValue, subscriber) {
  return new Promise(function (resolve, reject) {
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
        reject(err)
      })
  })
}

const _saveIntoGoogleSheet = (req, res, broadcastPayload, subscribers, message) => {
  callApi(`integrations/query`, 'post', {companyId: subscribers[0].companyId, integrationName: 'Google Sheets'})
    .then(integration => {
      integration = integration[0]
      if (integration && integration.enabled) {
        const oauth2Client = new google.auth.OAuth2(
          config.google.client_id,
          config.google.client_secret,
          config.google.callbackURL
        )
        oauth2Client.credentials = integration.integrationPayload
        if (integration && integration.enabled) {
          if (broadcastPayload.action.googleSheetAction === 'insert_row') {
            if (subscribers[0].waitingForUserInput.googleSheetRange) {
              _updateRow(req, res, subscribers[0].waitingForUserInput.googleSheetRange, broadcastPayload, subscribers, message, oauth2Client, true)
            }
            else {
              _insertRow(req, res, broadcastPayload, subscribers, message, oauth2Client)
            }
          } else if (broadcastPayload.action.googleSheetAction === 'update_row') {
            let resp = broadcastPayload.action
            getLookUpValue(resp.lookUpValue, subscribers[0])
              .then(lookUpValue => {
                if (lookUpValue !== '') {
                  logger.serverLog(TAG, `lookUpValue userInput Controller ${JSON.stringify(lookUpValue)}`)
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
                        _updateRow(req, res, range, broadcastPayload, subscribers, message, oauth2Client)
                      } else { 
                        _insertRow(req, res, broadcastPayload, subscribers, message, oauth2Client, true)   
                      }
                    }
                  })
                }
              }).catch(err => {
                logger.serverLog(TAG, `Failed to get LookUp Value ${err}`, 'error')
              })
          }
        }
      }
    }).catch(err => {
      logger.serverLog(TAG, `Failed to fetch integrations ${err}`, 'error')
    })
}

const _updateRow = (req, res, range, broadcastPayload, subscribers, message, oauth2Client, insertRow) => {
  let resp = broadcastPayload.action
  let user = {
    companyId: subscribers[0].companyId
  }
  req.user = user
  req.body.user_input = true
  req.body.spreadsheetId = resp.spreadSheet
  req.body.sheetId = resp.worksheet
  fetchColumns(req, res)
    .then(Columns => {
      let data = []
      for (var i = 0; i < Columns.googleSheetColumns.length; i++) {
        if (Columns.googleSheetColumns[i] === resp.googleSheetColumn) {
          data.push(message.text)
        } else {
          data.push(null)
        }
      }
      logger.serverLog(TAG, ` range in updateRow function ${range}`)
      logger.serverLog(TAG, ` data to send update row userinput controller ${JSON.stringify(data)}`)
      let dataToSend = [data]
      let request = {
        spreadsheetId: resp.spreadSheet,
        range: insertRow ? range : `${resp.worksheetName}!A${range.j + 1}`,
        valueInputOption: 'RAW',
        resource: {
          'majorDimension': 'ROWS',
          'range': insertRow ? range : `${resp.worksheetName}!A${range.j + 1}`,
          'values': dataToSend
        },
        auth: oauth2Client
      }
      sheets.spreadsheets.values.update(request, function (err, response) {
        if (err) {
          logger.serverLog(TAG, `Failed to update row ${JSON.stringify(err)}`, 'error')
        }
      })
    }).catch(err => {
      logger.serverLog(TAG, `Failed to fetch columns in update row ${err}`, 'error')
    })
}

const _insertRow = (req, res, broadcastPayload, subscribers, message, oauth2Client, updateRow) => {
  let resp = broadcastPayload.action
  let user = {
    companyId: subscribers[0].companyId
  }
  req.user = user
  req.body.user_input = true
  req.body.spreadsheetId = resp.spreadSheet
  req.body.sheetId = resp.worksheet
  fetchColumns(req, res)
    .then(Columns => {
      logger.serverLog(TAG, `fetchColumns ${JSON.stringify(Columns)}`, 'error')
      createDataInsertRow(resp, Columns, subscribers, message, updateRow).then(data => {
        logger.serverLog(TAG, ` data to send insert row userinput controller ${JSON.stringify(data)}`)
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
          else {
            let waitingForUserInput = subscribers[0].waitingForUserInput
            waitingForUserInput.googleSheetRange = response.data.updates.updatedRange.split(':')[0]
            logger.serverLog(TAG, ` waitingForUserInput after response ${waitingForUserInput}`)
            let subscriber = {
              data: subscribers
            } 
            _subscriberUpdate(subscriber, waitingForUserInput)
          }
        })
      }).catch(err => {
        logger.serverLog(TAG, `Failed to create data  for insert row ${err}`, 'error')
      })
    }).catch(err => {
      logger.serverLog(TAG, `Failed to fetch columns in insert row ${err}`, 'error')
    })
}

const createDataInsertRow = (resp, Columns, subscribers, message, updateRow) => {
  let data = []
  let requests = []
  for (var i = 0; i < Columns.googleSheetColumns.length; i++) {
    requests.push(new Promise((resolve, reject) => {
      if (Columns.googleSheetColumns[i] === resp.googleSheetColumn) {
        data.push(message.text)
        resolve(message.text)
      } else {
        if (updateRow) {
          if (Columns.googleSheetColumns[i] === resp.lookUpColumn) {
            if (subscribers[0][resp.lookUpValue] || resp.lookUpValue === 'fullName') {
              if (resp.lookUpValue === 'fullName') {
                //data.push(subscribers[0]['firstName'] + ' ' + subscribers[0]['lastName'])
                resolve(subscribers[0]['firstName'] + ' ' + subscribers[0]['lastName'])
              }
              else {
                //data.push(subscribers[0][resp.lookUpValue])
                resolve(subscribers[0][resp.lookUpValue])
              }
            } else {
              callApi(
                'custom_field_subscribers/query',
                'post',
                {
                  purpose: 'findOne',
                  match: { customFieldId: resp.lookUpValue, subscriberId: subscribers[0]._id }
                }
              )
                .then(customFieldSubscriber => {
                  if (customFieldSubscriber) {
                    //data.push(customFieldSubscriber.value)
                    resolve(customFieldSubscriber.value)
                  }
                })
                .catch(err => {
                  logger.serverLog(TAG, `Failed to fetch custom field subscriber ${JSON.stringify(err)}`, 'error')
                })
            }
          } else {
            //data.push(null)
            resolve(null)
          }
        } else {
          //data.push(null)
          resolve(null)
        }
      }
    }))
  }
  return Promise.all(requests).then(results => {
    return results
  })
}