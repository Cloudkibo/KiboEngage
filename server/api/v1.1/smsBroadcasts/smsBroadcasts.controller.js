const logicLayer = require('./smsBroadcasts.logiclayer')
const dataLayer = require('./smsBroadcasts.datalayer')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'smsBroadcasts.controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const async = require('async')
const { incrementCompanyUsageMessage, fetchUsages } = require('../utility/miscApiCalls.controller')
const { ActionTypes } = require('../../../smsMapper/constants')
const { smsMapper } = require('../../../smsMapper')

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
const _getContactsCount = (data, next) => {
  let query = JSON.parse(JSON.stringify(data.query))
  query.push({$group: { _id: null, count: { $sum: 1 } }})
  utility.callApi(`contacts/aggregate`, 'post', query) // fetch company user
    .then(result => {
      if (result.length > 0) {
        next(null, data)
      } else {
        next('No contacts match the provided criteria')
      }
    })
    .catch(error => {
      next(error)
    })
}
const _getContacts = (data) => {
  return new Promise((resolve, reject) => {
    utility.callApi(`contacts/aggregate`, 'post', data.query)
      .then(contacts => {
        if (contacts.length > 0) {
          data.contactIds = contacts.map(c => c._id)
          data.contacts = contacts
          _sendBroadcast(data)
            .then(r => {
              data.query[0].$match['_id'] = {$gt: contacts[contacts.length - 1]._id}
              _getContacts(data)
                .then(s => resolve(data))
                .catch((err) => {
                  reject(err)
                })
            })
            .catch((err) => {
              reject(err)
            })
        } else {
          resolve(data)
        }
      })
      .catch((err) => {
        reject(err)
      })
  })
}
exports.sendBroadcast = function (req, res) {
  fetchUsages(req.user.companyId, req.user.purchasedPlans['sms'], 'sms')
    .then(({companyUsage, planUsage}) => {
      if (companyUsage.messages >= planUsage.messages) {
        sendErrorResponse(res, 500, '', `You have consumed the resources for current billing cycle. So, you won't be able to send any more messages. Your resources will be reset starting next billing cycle`)
      } else {
        let query = logicLayer.prepareQueryToGetContacts(req.body, req.user.companyId)
        req.body.message = req.body.payload
        let data = {
          body: req.body,
          companyId: req.user.companyId,
          userId: req.user._id,
          sent: 0,
          followUp: false,
          query: query
        }
        async.series([
          _getContactsCount.bind(null, data),
          _createBroadcast.bind(null, data),
          _fetchCompany.bind(null, data)
        ], function (err) {
          if (err) {
            const message = err || 'Failed to send broadcast'
            logger.serverLog(message,
              `${TAG}: exports.sendBroadcast`,
              req.body,
              {data},
              message.includes('No contacts') ? 'info' : 'error')
            sendErrorResponse(res, 500, '', err)
          } else {
            data.query.push({$limit: 50})
            _getContacts(data)
              .then(resp => {
                _updateBroadcast(resp)
                require('./../../../config/socketio').sendMessageToClient({
                  room_id: req.user.companyId,
                  body: {
                    action: 'new_sms_broadcast',
                    payload: {
                      broadcast: data.broadcast,
                      sent: data.sent,
                      user_id: req.user._id
                    }
                  }
                })
                sendSuccessResponse(res, 200, '', 'Broadcast sent successfully')
              })
              .catch((err) => {
                const message = err || 'Failed to sendBroadcast'
                logger.serverLog(message, `${TAG}: exports.sendFollowupBroadcast`, req.body, {data}, 'error')
                sendErrorResponse(res, 500, '', err)
              })
          }
        })
      }
    })
    .catch((err) => {
      const message = err || 'Failed to fetch usages'
      logger.serverLog(message, `${TAG}: exports.sendFollowupBroadcast`, req.body, {}, 'error')
      sendErrorResponse(res, 500, '', err)
    })
}

exports.getCount = function (req, res) {
  var criteria = logicLayer.prepareQueryToGetContacts(req.body, req.user.companyId)
  criteria.push({$group: { _id: null, count: { $sum: 1 } }})
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
      let accountSid = companyuser.companyId.sms.accountSID
      let authToken = companyuser.companyId.sms.authToken
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

function _getResponses (responsesArray, n, getCounts) {
  let othersCount
  let sortedArray = responsesArray.slice().sort((a, b) => {
    return b.count - a.count
  })
  let responses = sortedArray.slice(0, n)
  if (getCounts) {
    othersCount = sortedArray.slice(n).reduce((accum, item) => accum + item.count, 0)
  }
  responses.push({_id: 'others', count: othersCount})
  return responses
}
exports.analytics = function (req, res) {
  let query = logicLayer.getCriteriaForUniqueResponses(req.params.id, true)
  utility.callApi(`broadcasts/responses/query`, 'post', query, 'kiboengage')
    .then(result => {
      let responses = result.length > 0 ? result : []
      let responded = result.length > 0 ? result.reduce((accum, item) => accum + item.count, 0) : 0
      if (result.length > 5) {
        responses = _getResponses(result, 4, true)
      }
      let payload = {
        responded: responded,
        responses: responses
      }
      sendSuccessResponse(res, 200, payload)
    })
    .catch(error => {
      const message = error || 'Failed to get analytics'
      logger.serverLog(message, `${TAG}: exports.analytics`, req.params.id, {user: req.user}, 'error')
      sendErrorResponse(res, 500, 'Failed to get analytics')
    })
}

exports.responses = function (req, res) {
  if (req.body.purpose === 'unique_responses') {
    let query = logicLayer.getCriteriaForUniqueResponses(req.params.id)
    utility.callApi(`broadcasts/responses/query`, 'post', query, 'kiboengage')
      .then(result => {
        let responses = result.length > 0 ? result : []
        if (result.length > 5) {
          responses = _getResponses(result, 4)
        }
        let payload = responses.map(r => r._id)
        sendSuccessResponse(res, 200, payload)
      })
      .catch(error => {
        const message = error || 'Failed to get responses'
        logger.serverLog(message, `${TAG}: exports.responses`, req.params.id, {user: req.user}, 'error')
        sendErrorResponse(res, 500, 'Failed to get responses')
      })
  } else {
    let query = logicLayer.getCriteriaForResponses(req.body, req.params.id)
    utility.callApi(`broadcasts/responses/query`, 'post', query, 'kiboengage')
      .then(result => {
        let subscriberIds = result.map(r => r.customerId)
        utility.callApi(`contacts/query`, 'post', {
          _id: {$in: subscriberIds}})
          .then(contacts => {
            let payloadToSend = contacts.map(c => {
              let response = result.filter(r => r.customerId === c._id)[0]
              return {
                _id: response._id,
                number: c.number,
                name: c.name,
                datetime: response.datetime,
                text: response.response.text
              }
            })
            sendSuccessResponse(res, 200, payloadToSend)
          })
          .catch(error => {
            const message = error || 'Failed to get contacts'
            logger.serverLog(message, `${TAG}: exports.responses`, req.body, {user: req.user, query}, 'error')
            sendErrorResponse(res, 500, 'Failed to get responses')
          })
      })
      .catch(error => {
        const message = error || 'Failed to get responses'
        logger.serverLog(message, `${TAG}: exports.responses`, req.body, {user: req.user, query}, 'error')
        sendErrorResponse(res, 500, 'Failed to get responses')
      })
  }
}
exports.sendFollowupBroadcast = function (req, res) {
  fetchUsages(req.user.companyId, req.user.purchasedPlans['sms'], 'sms')
    .then(({companyUsage, planUsage}) => {
      if (companyUsage.messages >= planUsage.messages) {
        sendErrorResponse(res, 500, '', `You have consumed the resources for current billing cycle. So, you won't be able to send any more messages. Your resources will be reset starting next billing cycle`)
      } else {
        let data = {
          body: req.body,
          companyId: req.user.companyId,
          userId: req.user._id,
          sent: 0,
          followUp: true
        }
        let query = logicLayer.getCriteriaForFollowUp(data.body, data.companyId)
        data.query = query
        async.series([
          _getSubscribersCount.bind(null, data),
          _createBroadcast.bind(null, data),
          _fetchCompany.bind(null, data)
        ], function (err) {
          if (err) {
            const message = err || 'Failed to sendFollowupBroadcast'
            logger.serverLog(message,
              `${TAG}: exports.sendFollowupBroadcast`,
              req.body,
              {data},
              message.includes('No contacts') ? 'info' : 'error')
            sendErrorResponse(res, 500, '', err)
          } else {
            data.query.limit = 50
            _getSubscribers(data)
              .then(resp => {
                _updateBroadcast(resp)
                require('./../../../config/socketio').sendMessageToClient({
                  room_id: req.user.companyId,
                  body: {
                    action: 'new_sms_broadcast',
                    payload: {
                      broadcast: data.broadcast,
                      sent: data.sent,
                      user_id: req.user._id
                    }
                  }
                })
                sendSuccessResponse(res, 200, 'Broadcast sent successfully')
              })
              .catch((err) => {
                const message = err || 'Failed to sendFollowupBroadcast'
                logger.serverLog(message, `${TAG}: exports.sendFollowupBroadcast`, req.body, {data}, 'error')
                sendErrorResponse(res, 500, '', err)
              })
          }
        })
      }
    })
    .catch((err) => {
      const message = err || 'Failed to fetch usages'
      logger.serverLog(message, `${TAG}: exports.sendFollowupBroadcast`, req.body, {}, 'error')
      sendErrorResponse(res, 500, '', err)
    })
}
const _fetchCompany = (data, next) => {
  utility.callApi(`companyprofile/query`, 'post', {_id: data.companyId})
    .then(company => {
      data.company = company
      next()
    })
    .catch((err) => {
      next(err)
    })
}
const _getSubscribersCount = (data, next) => {
  let query = JSON.parse(JSON.stringify(data.query))
  query.group = { _id: null, count: { $sum: 1 } }
  utility.callApi(`broadcasts/responses/query`, 'post', data.query, 'kiboengage')
    .then(result => {
      if (result.length > 0) {
        next(null, data)
      } else {
        next('No contacts match the provided criteria')
      }
    })
    .catch(error => {
      next(error)
    })
}
const _getSubscribers = (data) => {
  return new Promise((resolve, reject) => {
    utility.callApi(`broadcasts/responses/query`, 'post', data.query, 'kiboengage')
      .then(result => {
        if (result.length > 0) {
          let subscriberIds = result.map(r => r.customerId)
          utility.callApi(`contacts/query`, 'post', {_id: {$in: subscriberIds}})
            .then(contacts => {
              data.contactIds = subscriberIds
              data.contacts = contacts
              _sendBroadcast(data)
                .then(r => {
                  data.query.match['_id'] = {$gt: result[result.length - 1]._id}
                  _getSubscribers(data)
                    .then(s => resolve(data))
                    .catch((err) => {
                      reject(err)
                    })
                })
                .catch((err) => {
                  reject(err)
                })
            })
            .catch((err) => {
              reject(err)
            })
        } else {
          resolve(data)
        }
      })
      .catch(error => {
        reject(error)
      })
  })
}
const _createBroadcast = (data, next) => {
  let broadcastPayload = {
    platform: 'twilio',
    payload: data.body.message,
    userId: data.userId,
    companyId: data.companyId,
    title: data.body.title,
    phoneNumber: data.body.phoneNumber,
    followUp: data.followUp
  }
  if (data.body.segmentation) {
    broadcastPayload.segmentation = data.body.segmentation
  }
  dataLayer.createBroadcast(broadcastPayload)
    .then(broadcast => {
      data.broadcast = broadcast
      next(null, data)
    })
    .catch((err) => {
      next(err)
    })
}
const _updateBroadcast = (data) => {
  dataLayer.updateBroadcast({_id: data.broadcast._id}, {sent: data.sent})
    .then(updated => {
    })
    .catch((err) => {
      const message = err || 'error at updating broadcast'
      logger.serverLog(message, `${TAG}: _updateBroadcast`, data, {}, 'error')
    })
  incrementCompanyUsageMessage(data.broadcast.companyId, 'sms', data.sent)
}
const _sendBroadcast = (data, next) => {
  return new Promise((resolve, reject) => {
    let requests = []
    for (let i = 0; i < data.contacts.length; i++) {
      requests.push(new Promise((resolve, reject) => {
        smsMapper(data.company.sms.provider, ActionTypes.SEND_TEXT_MESSAGE, {
          text: data.body.message[0].text,
          company: data.company,
          subscriber: data.contacts[i]
        })
          .then(response => {
            data.sent = data.sent + 1
            resolve(response)
          })
          .catch(error => {
            const message = error || 'error at sending broadcast'
            logger.serverLog(message, `${TAG}: _sendBroadcast`, data, {contact: data.contacts[i]},
              error.message.includes('unverified') ? 'info' : 'error')
            resolve()
          })
      }))
    }
    Promise.all(requests)
      .then((responses) => {
        resolve()
        let updatePayload = {
          query: {_id: {$in: data.contactIds}},
          newPayload: {$set: {waitingForBroadcastResponse: {status: true, broadcastId: data.broadcast._id}}},
          options: {multi: true}
        }
        utility.callApi(`contacts/update`, 'put', updatePayload)
          .then(updated => {
          })
          .catch((err) => {
            const message = err || 'error at updating contact'
            logger.serverLog(message, `${TAG}: exports._sendBroadcast`, data, {}, 'error')
          })
      })
  })
}
