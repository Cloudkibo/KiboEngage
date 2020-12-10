const logicLayer = require('./smsBroadcasts.logiclayer')
const dataLayer = require('./smsBroadcasts.datalayer')
const utility = require('../utility')
let config = require('./../../../config/environment')
const logger = require('../../../components/logger')
const TAG = 'smsBroadcasts.controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const async = require('async')

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
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to fetch broadcasts ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch broadcasts count ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.sendBroadcast = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email, populate: 'companyId'}) // fetch company user
    .then(companyUser => {
      dataLayer.createBroadcast(logicLayer.prepareBroadCastPayload(req, companyUser.companyId._id))
        .then(broadcast => {
          utility.callApi(`contacts/query`, 'post', logicLayer.prepareQueryToGetContacts(req.body, req.user.companyId)) // fetch company user
            .then(contacts => {
              let accountSid = companyUser.companyId.twilio.accountSID
              let authToken = companyUser.companyId.twilio.authToken
              let client = require('twilio')(accountSid, authToken)
              let requests = []
              let sent = 0
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
                        sent = sent + 1
                        let updatePayload = {
                          query: {_id: contacts[i]._id},
                          newPayload: {$set: {waitingForBroadcastResponse: {status: true, broadcastId: broadcast._id}}},
                          options: {}
                        }
                        utility.callApi(`contacts/update`, 'put', updatePayload)
                          .then(updated => {
                            resolve(response)
                          })
                          .catch((err) => {
                            const message = err || 'error at updating contact'
                            logger.serverLog(message, `${TAG}: exports.sendBroadcast`, req.body, {user: req.user}, 'error')
                            reject(err)
                          })
                      })
                      .catch(error => {
                        const message = error || 'error at sending message'
                        logger.serverLog(message, `${TAG}: exports.sendBroadcast`, req.body, {user: req.user}, 'error')
                        reject(error)
                      })
                  }))
                }
              }
              Promise.all(requests)
                .then((responses) => {
                  sendSuccessResponse(res, 200, '', 'Conversation sent successfully')
                  dataLayer.updateBroadcast({_id: broadcast._id}, {sent: sent})
                    .then(updated => {
                    })
                    .catch((err) => {
                      const message = err || 'Internal Server Error'
                      logger.serverLog(message, `${TAG}: exports.sendBroadcast`, req.body, {user: req.user}, 'error')
                    })
                })
                .catch((err) => {
                  const message = err || 'Internal Server Error'
                  logger.serverLog(message, `${TAG}: exports.sendBroadcast`, req.body, {user: req.user}, 'error')
                  sendErrorResponse(res, 500, '', `Failed to Send Broadcast to all Subscribers ${err}`)
                })
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.sendBroadcast`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to fetch contacts ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.sendBroadcast`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to create broadcast ${JSON.stringify(error)}`)
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.sendBroadcast`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
        })
    })
}

exports.getCount = function (req, res) {
  var criteria = logicLayer.checkFilterValuesForGetCount(req.body, req.user.companyId)
  utility.callApi(`contacts/aggregate`, 'post', criteria)
    .then(result => {
      if (result.length > 0) {
        sendSuccessResponse(res, 200, {subscribersCount: result[0].count})
      } else {
        sendSuccessResponse(res, 200, {subscribersCount: 0})
      }
    })
    .catch(err => {
      const message = err || 'Failed to fetch count'
      logger.serverLog(message, `${TAG}: exports.getCount`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch count`)
    })
}
exports.getTwilioNumbers = function (req, res) {
  let numbers = []
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email, populate: 'companyId' }) // fetch company user
    .then(companyuser => {
      let accountSid = companyuser.companyId.twilio.accountSID
      let authToken = companyuser.companyId.twilio.authToken
      let client = require('twilio')(accountSid, authToken)
      client.incomingPhoneNumbers
        .list().then((incomingPhoneNumbers) => {
          for (let i = 0; i < incomingPhoneNumbers.length; i++) {
            numbers.push(incomingPhoneNumbers[i].phoneNumber)
            if (i === incomingPhoneNumbers.length - 1) {
              sendSuccessResponse(res, 200, numbers)
            }
          }
        })
    })
    .catch(error => {
      const message = error || 'error at  getTwilioNumbers'
      logger.serverLog(message, `${TAG}:exports.getTwilioNumbers`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

function _getResponses (responsesArray, n) {
  let sortedArray = responsesArray.slice().sort((a, b) => {
    return b.count - a.count
  })
  let responses = sortedArray.slice(0, n)
  let othersCount = sortedArray.slice(n).reduce((accum, item) => accum + item.count, 0)
  responses.push({_id: 'others', count: othersCount})
  return responses
}
exports.analytics = function (req, res) {
  let query = {
    purpose: 'aggregate',
    match: {broadcastId: req.params.id},
    group: { _id: {$toLower: '$response.text'}, count: { $sum: 1 } }
  }
  utility.callApi(`broadcasts/responses/query`, 'post', query, 'kiboengage')
    .then(result => {
      let responses = result.length > 0 ? result : []
      let responded = result.length > 0 ? result.reduce((accum, item) => accum + item.count, 0) : 0
      if (result.length > 5) {
        responses = _getResponses(result, 4)
      }
      let payload = {
        responded: responded,
        responses: responses
      }
      sendSuccessResponse(res, 200, payload)
    })
    .catch(error => {
      const message = error || 'Failed to get analytics'
      logger.serverLog(message, `${TAG}: exports.analytics`, req.params.id, {user: req.user, query}, 'error')
      sendErrorResponse(res, 500, 'Failed to get analytics')
    })
}
