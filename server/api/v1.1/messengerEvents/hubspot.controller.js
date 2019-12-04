const logger = require('../../../components/logger')
const TAG = 'api/messengerEvents/hubspotController.controller.js'
const {callApi} = require('../utility')
const config = require('./../../../config/environment')
const async = require('async')
const { refreshAuthToken, saveNewTokens, callHubspotApi } = require('./../hubspotIntegration/hubspotIntegration.controller')

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
                      submitForm(resp, subscriber, page, integration)
                    } else if (resp.hubspotAction === 'insert_contact') {
                      // performGoogleSheetAction(resp.googleSheetAction, resp, subscriber, oauth2Client)
                    } else if (resp.hubspotAction === 'update_contact') {
                      // performGoogleSheetAction(resp.googleSheetAction, resp, subscriber, oauth2Client)
                    } else if (resp.hubspotAction === 'get_contact') {
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

function submitForm (resp, subscriber, page, integration) {
  async.eachOf(resp.mapping, function (item, index, cb) {
    let data = {
      mapping: resp.mapping,
      item,
      index,
      subscriber
    }
    _getDataForSubscriberValues(data, cb)
  }, function (err) {
    if (err) {
      logger.serverLog(TAG, `Failed to fetch data to send ${JSON.stringify(err)}`, 'error')
    } else {
      let data = resp.mapping.map(item => {
        return { name: item.hubspotColumn, value: item.value }
      })
      let payload = {
        submittedAt: '' + Date.now(),
        fields: data,
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
      let newTokens
      refreshAuthToken(integration.integrationPayload.refresh_token)
        .then(tokens => {
          newTokens = tokens
          return saveNewTokens(integration, tokens)
        })
        .then(updated => {
          return callHubspotApi(hubspotUrl, 'post', payload, newTokens.access_token)
        })
        .then(form => {
          logger.serverLog(TAG, `Success in sending data to hubspot form`)
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to send data to hubspot form ${JSON.stringify(err)}`, 'error')
        })
    }
  })
}

function _getDataForSubscriberValues (data, callback) {
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

// Getting look up value from system subscriber fields
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
