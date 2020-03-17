const logicLayer = require('./smsBroadcasts.logiclayer')
const dataLayer = require('./smsBroadcasts.datalayer')
const utility = require('../utility')
let config = require('./../../../config/environment')
const logger = require('../../../components/logger')
const TAG = 'smsBroadcasts.controller.js'
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
          utility.callApi(`contacts/query`, 'post', {companyId: companyUser.companyId._id, isSubscribed: true}) // fetch company user
            .then(contacts => {
              let accountSid = companyUser.companyId.twilio.accountSID
              let authToken = companyUser.companyId.twilio.authToken
              let client = require('twilio')(accountSid, authToken)
              let requests = []
              for (let i = 0; i < contacts.length; i++) {
                var matchCriteria = logicLayer.checkFilterValues(req.body.segmentation, contacts[i])
                if (matchCriteria) {
                  requests.push(new Promise((resolve, reject) => {
                    client.messages
                      .create({
                        body: req.body.payload[0].text,
                        from: req.body.phoneNumber,
                        to: contacts[i].number,
                        statusCallback: config.api_urls.webhook + `/webhooks/twilio/trackDelivery/${broadcast._id}`
                      })
                      .then(response => {
                        logger.serverLog(TAG, `response from twilio ${JSON.stringify(response)}`)
                        resolve(response)
                      })
                      .catch(error => {
                        logger.serverLog(TAG, `error at sending message ${error}`, 'error')
                        resolve(error)
                      })
                  }))
                }
              }
              Promise.all(requests)
                .then((responses) => {
                  sendSuccessResponse(res, 200, '', 'Conversation sent successfully')
                })
                .catch((err) => sendErrorResponse(res, 500, '', 'Failed to Send Broadcast to all Subscribers'))
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

exports.getCount = function (req, res) {
  var criteria = logicLayer.checkFilterValuesForGetCount(req.body.segmentation, req.user.companyId)
  utility.callApi(`contacts/aggregate`, 'post', criteria)
    .then(result => {
      if (result.length > 0) {
        sendSuccessResponse(res, 200, {subscribersCount: result[0].count})
      } else {
        sendSuccessResponse(res, 200, {subscribersCount: 0})
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch  ${err}`)
      sendErrorResponse(res, 500, `Failed to fetch count`)
    })
}
exports.getTwilioNumbers = function (req, res) {
  logger.serverLog(TAG, `called function getTwilioNumbers`)
  let numbers = []
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email, populate: 'companyId' }) // fetch company user
    .then(companyuser => {
      logger.serverLog(TAG, `called function after fetching companyUser ${companyuser}`)
      let accountSid = companyuser.companyId.twilio.accountSID
      let authToken = companyuser.companyId.twilio.authToken
      let client = require('twilio')(accountSid, authToken)
      client.incomingPhoneNumbers
        .list().then((incomingPhoneNumbers) => {
          logger.serverLog(TAG, `incomingPhoneNumbers ${incomingPhoneNumbers}`)
          for (let i = 0; i < incomingPhoneNumbers.length; i++) {
            numbers.push(incomingPhoneNumbers[i].phoneNumber)
            if (i === incomingPhoneNumbers.length - 1) {
              sendSuccessResponse(res, 200, numbers)
            }
          }
        })
    })
    .catch(error => {
      logger.serverLog(TAG, `error at  getTwilioNumbers ${error}`, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
