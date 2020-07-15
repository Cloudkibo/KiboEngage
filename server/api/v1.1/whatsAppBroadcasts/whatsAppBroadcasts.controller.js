const logicLayer = require('./whatsAppBroadcasts.logiclayer')
const dataLayer = require('./whatsAppBroadcasts.datalayer')
const utility = require('../utility')
let config = require('./../../../config/environment')
const logger = require('../../../components/logger')
const TAG = 'whatsAppBroadcasts.controller.js'
const async = require('async')
let { sendOpAlert } = require('./../../global/operationalAlert')
const { flockSendApiCaller } = require('../../global/flockSendApiCaller')

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

function sendBrodcastComponent (req, res, companyUser, broadcast, contacts) {
  let contactNumbers = []
  contacts.map((c) => contactNumbers.push({phone: c.number}))
  async.eachOfSeries(req.body.payload, function (value, key, callback) {
    if (key < req.body.payload.length) {
      let {route, MessageObject} = logicLayer.prepareFlockSendPayload(value, companyUser, contactNumbers)
      flockSendApiCaller(route, 'post', MessageObject)
        .then(response => {
          logger.serverLog(TAG, `response from flockSendApiCaller ${response.body}`, 'error')
          let parsed = JSON.parse(response.body)
          if (parsed.code !== 200) {
            sendOpAlert(parsed.message, 'whatsAppBroadcast controller in kiboengage', null, req.user._id, companyUser.companyId._id)
            logger.serverLog(TAG, `error at sending message ${parsed.message}`, 'error')
            callback(parsed.message)
          } else {
            callback()
            for (let j = 0; j < contacts.length; j++) {
              let MessageObject = logicLayer.prepareChat(value, companyUser, contacts[j])
              utility.callApi(`whatsAppChat`, 'post', MessageObject, 'kibochat')
                .then(response => {
                })
                .catch(error => {
                  logger.serverLog(TAG, `Failed to save broadcast ${error}`, 'error')
                })
            }
          }
        })
    } else {
      callback()
    }
  }, function (err) {
    if (err) {
      sendErrorResponse(res, 500, '', 'Failed to send broadcast to all subscribers')
    } else {
      sendSuccessResponse(res, 200, '', 'Conversation sent successfully')
    }
  })
}
exports.sendBroadcast = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email, populate: 'companyId'}) // fetch company user
    .then(companyUser => {
      dataLayer.createBroadcast(logicLayer.prepareBroadCastPayload(req, companyUser.companyId._id))
        .then(broadcast => {
          utility.callApi(`whatsAppContacts/query`, 'post', {companyId: companyUser.companyId._id, isSubscribed: true}) // fetch company user
            .then(contacts => {
              getSubscribersCount(req, res, contacts, companyUser)
                .then(contactList => {
                  let ArrayContact = [].concat(...contactList)
                  sendBrodcastComponent(req, res, companyUser, broadcast, ArrayContact)
                })
                .catch(error => {
                  sendErrorResponse(res, 500, `Failed to get subscribers count ${JSON.stringify(error)}`)
                })
            })
            .catch(error => {
              sendErrorResponse(res, 500, `Failed to fetch contacts ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to create broadcast ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
function getSubscribersCount (req, res, contacts, companyUser) {
  return new Promise((resolve, reject) => {
    let requests = []
    for (let i = 0; i < contacts.length; i++) {
      requests.push((callback) => {
        // let finalCriteria = logicLayer.createPayloadgetSubscribersCount(companyUser.companyId._id, contacts[i].number)
        // utility.callApi(`whatsAppChat/query`, 'post', finalCriteria, 'kibochat') // fetch company user
        //   .then(data => {
        // if (data && data.length > 0) {
        var hours = (new Date() - new Date(contacts[i].lastMessagedAt)) / 3600000
        if (hours <= 24) {
          var matchCriteria = logicLayer.checkFilterValues(req.body.segmentation, contacts[i])
          if (matchCriteria) {
            callback(null, contacts[i])
          } else {
            callback(null, null)
          }
        } else {
          callback(null, null)
        }
        // } else {
        //   callback(null, null)
        // }
      // })
      // .catch(error => {
      //   reject(error)
      //   // sendErrorResponse(res, 500, `Failed to fetch livechat Data ${(error)}`)
      // })
      })
    }
    async.parallelLimit(requests, 30, function (err, results) {
      if (err) {
        reject(err)
      } else {
        var finalResults = results.filter(result => result !== null)
        resolve(finalResults)
      }
    })
  })
}
exports.getCount = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email, populate: 'companyId'}) // fetch company user
    .then(companyUser => {
      utility.callApi(`whatsAppContacts/query`, 'post', {companyId: companyUser.companyId._id, isSubscribed: true}) // fetch company user
        .then(contacts => {
          getSubscribersCount(req, res, contacts, companyUser)
            .then(Subscribers => {
              sendSuccessResponse(res, 200, {subscribersCount: Subscribers.length})
            })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch fetch contact user ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${error}`)
    })
}
