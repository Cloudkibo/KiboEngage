const logicLayer = require('./whatsAppBroadcasts.logiclayer')
const dataLayer = require('./whatsAppBroadcasts.datalayer')
const utility = require('../utility')
let config = require('./../../../config/environment')
const logger = require('../../../components/logger')
const TAG = 'whatsAppBroadcasts.controller.js'

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization) // fetch company user
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
              return res.status(200).json({
                status: 'success',
                payload: {broadcasts: broadcasts, count: count.length > 0 ? count[0].count : 0}
              })
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch broadcasts ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch broadcasts count ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}
exports.sendBroadcast = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email, populate: 'companyId'}, req.headers.authorization) // fetch company user
    .then(companyUser => {
      dataLayer.createBroadcast(logicLayer.prepareBroadCastPayload(req, companyUser.companyId._id))
        .then(broadcast => {
          utility.callApi(`contacts/query`, 'post', {companyId: companyUser.companyId._id}, req.headers.authorization) // fetch company user
            .then(contacts => {
              console.log('contacts fetched in sendBroadcast', contacts)
              console.log('companyUser fetched in sendBroadcast', companyUser)
              let accountSid = companyUser.companyId.twilioWhatsApp.accountSID
              let authToken = companyUser.companyId.twilioWhatsApp.authToken
              let client = require('twilio')(accountSid, authToken)
              for (let i = 0; i < contacts.length; i++) {
                var matchCriteria = logicLayer.checkFilterValues(req.body.segmentation, contacts[i])
                console.log('matchCriteria', matchCriteria)
                if (matchCriteria) {
                  client.messages
                    .create({
                      body: req.body.payload[0].text,
                      from: `whatsapp:${companyUser.companyId.twilioWhatsApp.sandboxNumber}`,
                      to: `whatsapp:${contacts[i].number}`,
                      statusCallback: config.api_urls.webhook + `/webhooks/twilio/trackDeliveryWhatsApp/${broadcast._id}`
                    })
                    .then(response => {
                      console.log('response from twilio send', response)
                      logger.serverLog(TAG, `response from twilio ${JSON.stringify(response)}`)
                    })
                    .catch(error => {
                      console.log('error at sending message', error)
                      logger.serverLog(TAG, `error at sending message ${error}`)
                    })
                }
                if (i === contacts.length - 1) {
                  return res.status(200)
                    .json({status: 'success', description: 'Conversation sent successfully!'})
                }
              }
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch contacts ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to create broadcast ${JSON.stringify(error)}`
          })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch company user ${JSON.stringify(error)}`
          })
        })
    })
}
