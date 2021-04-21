const LogicLayer = require('./logiclayer')
const DataLayer = require('./datalayer')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const utility = require('../utility')
const async = require('async')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/backdoor/userData.controller.js'

exports.getAllPages = function (req, res) {
  let criterias = LogicLayer.getAllPagesCriteria(req.params.userid, req.body)
  utility.callApi(`pages/aggregate`, 'post', criterias.countCriteria) // fetch connected pages count
    .then(count => {
      utility.callApi(`pages/aggregate`, 'post', criterias.finalCriteria) // fetch connected pages
        .then(pages => {
          let pagesArray = []
          async.each(pages, function (page, next) {
            let subscriberCriteria = LogicLayer.getSubscribersCountForPages(page)
            utility.callApi(`subscribers/aggregate`, 'post', subscriberCriteria) // fetch connected pages count
            .then(result => {
              pagesArray.push({
                _id: page._id,
                pageId: page.pageId,
                pageName: page.pageName,
                userId: page.userId,
                pagePic: page.pagePic,
                connected: page.connected,
                pageUserName: page.pageUserName,
                isApproved: page.isApproved,
                likes: page.likes,
                subscribers: result.length > 0 ? result[0].count : 0
              })
              next()
            })
            .catch(err => {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.getAllPages`, req.body, {user: req.user}, 'error')
              next(err)
            })
          }, function (err) {
            if (err) {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.getAllPages`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to fetch pages ${JSON.stringify(err)}`)
            } else {
              let payload = {
                pages: pagesArray,
                count: pagesArray.length > 0 ? count[0].count : ''
              }
              sendSuccessResponse(res, 200, payload)
            }
          })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.getAllPages`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch pages ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.getAllPages`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch pages count ${JSON.stringify(error)}`)
    })
}
exports.getUserSummary = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {userId: req.body.userId})
    .then(companyUser => {
      async.parallelLimit([
        function (callback) {
          utility.callApi(`pages/query`, 'post', {companyId: companyUser.companyId, connected: true})
            .then(pages => {
              let pageIds = []
              for (let i = 0; i < pages.length; i++) {
                pageIds.push(pages[i]._id)
              }
              let subscriberCriteria = LogicLayer.getSubscribersCountForUser(req.body, pageIds)
              utility.callApi(`subscribers/aggregate`, 'post', subscriberCriteria)
                .then(subscribers => {
                  callback(null, subscribers)
                })
                .catch(err => {
                  const message = err || 'Internal Server Error'
                  logger.serverLog(message, `${TAG}: exports.getUserSummary`, req.body, {user: req.user}, 'error')
                  callback(err)
                })
            })
            .catch(err => {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.getUserSummary`, req.body, {user: req.user}, 'error')
              callback(err)
            })
        },
        function (callback) {
          let messagesCriteria = LogicLayer.getMessagesCountForUser(companyUser, req.body, false, 'convos')
          utility.callApi(`livechat/query`, 'post', messagesCriteria, 'kibochat')
            .then(result => {
              callback(null, result)
            })
            .catch(err => {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.getUserSummary`, req.body, {user: req.user}, 'error')
              callback(err)
            })
        },
        function (callback) {
          let messagesCriteria = LogicLayer.getMessagesCountForUser(companyUser, req.body, true, 'convos')
          utility.callApi(`livechat/query`, 'post', messagesCriteria, 'kibochat')
            .then(result => {
              callback(null, result)
            })
            .catch(err => {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.getUserSummary`, req.body, {user: req.user}, 'error')
              callback(err)
            })
        },
        function (callback) {
          let messagesCriteria = LogicLayer.getMessagesCountForUser(companyUser, req.body, true, 'facebook')
          utility.callApi(`livechat/query`, 'post', messagesCriteria, 'kibochat')
            .then(result => {
              callback(null, result)
            })
            .catch(err => {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.getUserSummary`, req.body, {user: req.user}, 'error')
              callback(err)
            })
        }
      ], 10, function (err, results) {
        if (err) {
          sendErrorResponse(res, 500, '', `Error in getting user summary ${JSON.stringify(err)}`)
        } else {
          let subscribers = results[0]
          let messagesCount = results[1]
          let facebookInboxMessagesCount = results[2]
          let facebookMessageReceivedCount = results[3]
          let data = {
            subscribersCount: subscribers[0] ? subscribers[0].count : 0,
            messagesCount: messagesCount[0] ? messagesCount[0].count : 0,
            facebookInboxMessagesCount: facebookInboxMessagesCount[0] ? facebookInboxMessagesCount[0].count : 0,
            facebookMessageReceived: facebookMessageReceivedCount[0] ? facebookMessageReceivedCount[0].count : 0
          }
          sendSuccessResponse(res, 200, data)
        }
      })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.getUserSummary`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Error in getting companyUser record ${JSON.stringify(err)}`)
    })
}

exports.allUserBroadcasts = function (req, res) {
  let criteria = LogicLayer.allUserBroadcastsCriteria(req.params.userid, req.body)
  DataLayer.countBroadcasts(criteria.countCriteria[0].$match)
    .then(broadcastsCount => {
      let aggregateMatch = criteria.finalCriteria[0].$match
      let aggregateSort = criteria.finalCriteria[1].$sort
      let aggregateSkip = criteria.finalCriteria[2].$skip
      let aggregateLimit = criteria.finalCriteria[3].$limit
      DataLayer.aggregateForBroadcasts(aggregateMatch, undefined, undefined, aggregateLimit, aggregateSort, aggregateSkip)
        .then(broadcasts => {
          let payload = {
            broadcasts: broadcasts,
            count: broadcasts.length > 0 ? broadcastsCount[0].count : ''
          }
          sendSuccessResponse(res, 200, payload)
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.allUserBroadcasts`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch broadcasts ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.allUserBroadcasts`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch broadcasts count ${JSON.stringify(error)}`)
    })
}
exports.allUserPolls = function (req, res) {
  let criteria = LogicLayer.allUserPollsCriteria(req.params.userid, req.body)
  DataLayer.countPolls(criteria.countCriteria[0].$match)
    .then(pollsCount => {
      let aggregateMatch = criteria.finalCriteria[0].$match
      let aggregateSort = criteria.finalCriteria[1].$sort
      let aggregateSkip = criteria.finalCriteria[2].$skip
      let aggregateLimit = criteria.finalCriteria[3].$limit
      DataLayer.aggregateForPolls(aggregateMatch, undefined, undefined, aggregateLimit, aggregateSort, aggregateSkip)
        .then(polls => {
          let payload = {
            polls: polls,
            count: polls.length > 0 ? pollsCount[0].count : ''
          }
          sendSuccessResponse(res, 200, payload)
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.allUserPolls`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to polls ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.allUserPolls`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch polls count ${JSON.stringify(error)}`)
    })
}
exports.allUserSurveys = function (req, res) {
  let criteria = LogicLayer.allUserPollsCriteria(req.params.userid, req.body, true)
  DataLayer.countSurveys(criteria.countCriteria[0].$match)
    .then(surveysCount => {
      let aggregateMatch = criteria.finalCriteria[0].$match
      let aggregateSort = criteria.finalCriteria[1].$sort
      let aggregateSkip = criteria.finalCriteria[2].$skip
      let aggregateLimit = criteria.finalCriteria[3].$limit
      DataLayer.aggregateForSurveys(aggregateMatch, undefined, undefined, aggregateLimit, aggregateSort, aggregateSkip)
        .then(surveys => {
          let payload = {
            surveys: surveys,
            count: surveys.length > 0 ? surveysCount[0].count : ''
          }
          sendSuccessResponse(res, 200, payload)
        })
    })
}
exports.getMessagesCount = function (req, res) {
  let query = {
    purpose: 'aggregate',
    match: {
      format: 'convos',
      company_id: req.body.companyId && req.body.companyId !== '' ? req.body.companyId : {$exists: true}
    },
    group: { _id: null, count: { $sum: 1 } }
  }
  console.log('query sent', query)
  utility.callApi(`livechat/query`, 'post', query, 'kibochat')
    .then(result => {
      let data = {
        totalMessagesSent: result[0] ? result[0].count : 0
      }
      sendSuccessResponse(res, 200, data)
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.getMessagesCount`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Error in getting messages count ${err}`)
    })
}
