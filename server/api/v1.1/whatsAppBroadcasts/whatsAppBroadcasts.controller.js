const logicLayer = require('./whatsAppBroadcasts.logiclayer')
const dataLayer = require('./whatsAppBroadcasts.datalayer')
const utility = require('../utility')
let config = require('./../../../config/environment')
const logger = require('../../../components/logger')
const TAG = 'whatsAppBroadcasts.controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      let criteria = logicLayer.getCriterias(req.body, companyuser)
      dataLayer.countBroadcasts(criteria.countCriteria[0].$match)
        .then(count => {
          let aggregateMatch = criteria.fetchCriteria[0].$match
          let aggregateSort = criteria.fetchCriteria[1].$sort
          let aggregateSkip = criteria.fetchCriteria[2].$skip
          let aggregateLimit = criteria.fetchCriteria[3].$limit
          dataLayer.aggregateForBroadcasts(aggregateMatch, undefined, undefined, aggregateLimit, aggregateSort, aggregateSkip)
            .then(broadcasts => {
              sendSuccessResponse(res, 200, {broadcasts: broadcasts, count: count.length > 0 ? count[0].count : 0})
            })
            .catch(error => {
              sendErrorResponse(res, 500, `Failed to fetch broadcasts ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch broadcasts count ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.sendBroadcast = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email, populate: 'companyId'}) // fetch company user
    .then(companyUser => {
      dataLayer.createBroadcast(logicLayer.prepareBroadCastPayload(req, companyUser.companyId._id))
        .then(broadcast => {
          utility.callApi(`whatsAppContacts/query`, 'post', {companyId: companyUser.companyId._id, isSubscribed: true}) // fetch company user
            .then(contacts => {
              let accountSid = companyUser.companyId.twilioWhatsApp.accountSID
              let authToken = companyUser.companyId.twilioWhatsApp.authToken
              let client = require('twilio')(accountSid, authToken)
              for (let i = 0; i < contacts.length; i++) {
                var matchCriteria = logicLayer.checkFilterValues(req.body.segmentation, contacts[i])
                if (matchCriteria) {
                  client.messages
                    .create({
                      body: req.body.payload[0].text,
                      from: `whatsapp:${companyUser.companyId.twilioWhatsApp.sandboxNumber}`,
                      to: `whatsapp:${contacts[i].number}`,
                      statusCallback: config.api_urls.webhook + `/webhooks/twilio/trackDeliveryWhatsApp/${broadcast._id}`
                    })
                    .then(response => {
                      logger.serverLog(TAG, `response from twilio ${JSON.stringify(response)}`)
                      let MessageObject = logicLayer.prepareChat(req.body.payload[0], companyUser, contacts[i])
                      utility.callApi(`whatsAppChat`, 'post', MessageObject, 'kibochat')
                        .then(response => {
                        })
                        .catch(error => {
                          logger.serverLog(TAG, `Failed to save broadcast ${error}`, 'error')
                        })
                    })
                    .catch(error => {
                      logger.serverLog(TAG, `error at sending message ${error}`, 'error')
                    })
                }
                if (i === contacts.length - 1) {
                  sendSuccessResponse(res, 200, 'Conversation sent successfully!')
                }
              }
            })
            .catch(error => {
              sendErrorResponse(res, 500, `Failed to fetch contacts ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to create broadcast ${JSON.stringify(error)}`)
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
        })
    })
}
