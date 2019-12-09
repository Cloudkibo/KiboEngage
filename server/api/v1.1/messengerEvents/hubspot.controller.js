const logger = require('../../../components/logger')
const TAG = 'api/messengerEvents/hubspotController.controller.js'
const {callApi} = require('../utility')
const datalayer = require('./googleSheets.datalayer')
const async = require('async')
const { refreshAuthToken, saveNewTokens, callHubspotApi } = require('./../hubspotIntegration/hubspotIntegration.controller')
const { getDataForSubscriberValues } = require('./../../global/externalIntegrations')

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
  logger.serverLog(TAG, `Success in sending data ${JSON.stringify(resp)}`)
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
                      insertContact(resp, subscriber, integration)
                    } else if (resp.hubspotAction === 'update_contact') {
                      updateContact(resp, subscriber, integration)
                    } else if (resp.hubspotAction === 'get_contact') {
                      getContact(resp, subscriber, integration)
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
    getDataForSubscriberValues(data, cb)
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
      sendToHubspot(integration, hubspotUrl, payload, 'post')
    }
  })
}

function insertContact (resp, subscriber, integration) {
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
      logger.serverLog(TAG, `Failed to fetch data to send ${JSON.stringify(err)}`, 'error')
    } else {
      let data = resp.mapping.map(item => {
        return { property: item.hubspotColumn, value: item.value }
      })
      let payload = {
        properties: data
      }
      let hubspotUrl = `https://api.hubapi.com/contacts/v1/contact/`
      sendToHubspot(integration, hubspotUrl, payload, 'post')
    }
  })
}

function updateContact (resp, subscriber, integration) {
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
      logger.serverLog(TAG, `Failed to fetch data to send ${JSON.stringify(err)}`, 'error')
    } else {
      let data = resp.mapping.map(item => {
        return { property: item.hubspotColumn, value: item.value }
      })
      let payload = {
        properties: data
      }
      let hubspotUrl = `https://api.hubapi.com/contacts/v1/contact/email/${resp.email}/profile`
      sendToHubspot(integration, hubspotUrl, payload, 'post')
    }
  })
}

function getContact (resp, subscriber, integration) {
  let hubspotUrl = `https://api.hubapi.com/contacts/v1/contact/email/${resp.email}/profile`
  sendToHubspot(integration, hubspotUrl, null, 'get')
    .then(hubspotContact => {
      updateSubscriberData(resp, subscriber, hubspotContact.properties)
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to send data to hubspot form ${JSON.stringify(err)}`, 'error')
    })
}

function updateSubscriberData (resp, subscriber, hubspotContact) {
  let newSubscriberPayload = {}
  for (let i = 0; i < resp.mapping.length; i++) {
    let { kiboPushColumn, hubspotColumn, customFieldColumn } = resp.mapping[i]
    if (kiboPushColumn) {
      newSubscriberPayload[kiboPushColumn] = hubspotContact[hubspotColumn].value
    } else if (customFieldColumn) {
      let newData = hubspotContact[hubspotColumn].value
      if (newData && newData !== '') {
        datalayer.genericUpdate({ customFieldId: customFieldColumn, subscriberId: subscriber._id },
          { value: newData },
          { upsert: true }
        )
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

function sendToHubspot (integration, hubspotUrl, payload, method) {
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
