const logicLayer = require('./whatsAppBroadcasts.logiclayer')
const dataLayer = require('./whatsAppBroadcasts.datalayer')
const utility = require('../utility')
const async = require('async')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const {ActionTypes} = require('../../../whatsAppMapper/constants')
const {whatsAppMapper} = require('../../../whatsAppMapper/whatsAppMapper')
const logger = require('../../../components/logger')
const TAG = 'api/whatsAppBroadcasts/whatsAppBroadcasts.controller.js'

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

function sendBrodcastComponent (req, res, broadcast, contacts) {
  let mapperData = {
    contacts: contacts,
    whatsApp: req.user.whatsApp,
    broadcastId: broadcast._id,
    companyId: req.user.companyId,
    userId: req.user._id,
    payload: req.body.payload
  }
  whatsAppMapper(req.user.whatsApp.provider, ActionTypes.SEND_BROADCAST_MESSAGES, mapperData)
    .then(response => {
      sendSuccessResponse(res, 200, '', 'Conversation sent successfully')
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: sendBrodcastComponent`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Failed to send broadcast to all subscribers ${error}`)
    })
}

exports.sendBroadcast = function (req, res) {
  dataLayer.createBroadcast(logicLayer.prepareBroadCastPayload(req, req.user.companyId))
    .then(broadcast => {
      utility.callApi(`whatsAppContacts/query`, 'post', {companyId: req.user.companyId, isSubscribed: true}) // fetch company user
        .then(contacts => {
          getSubscribersCount(req, res, contacts)
            .then(contactList => {
              let ArrayContact = [].concat(...contactList)
              sendBrodcastComponent(req, res, broadcast, ArrayContact)
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.sendBroadcast`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to get subscribers count ${JSON.stringify(error)}`)
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
}
function getSubscribersCount (req, res, contacts) {
  return new Promise((resolve, reject) => {
    let requests = []
    for (let i = 0; i < contacts.length; i++) {
      requests.push((callback) => {
        // let finalCriteria = logicLayer.createPayloadgetSubscribersCount(companyUser.companyId._id, contacts[i].number)
        // utility.callApi(`whatsAppChat/query`, 'post', finalCriteria, 'kibochat') // fetch company user
        //   .then(data => {
        // if (data && data.length > 0) {
        var hours = (new Date() - new Date(contacts[i].lastMessagedAt)) / 3600000
        if (req.body.onlyTemplates || hours <= 24) {
          var matchCriteria = logicLayer.checkFilterValues(req.body.segmentation, contacts[i])
          if (matchCriteria) {
            callback(null, contacts[i])
          } else {
            callback(null, null)
          }
        } else {
          callback(null, null)
        }
      })
    }
    async.parallelLimit(requests, 30, function (err, results) {
      if (err) {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: getSubscribersCount`, req.body, {user: req.user}, 'error')
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
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.getCount`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch fetch contact user ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.getCount`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${error}`)
    })
}
