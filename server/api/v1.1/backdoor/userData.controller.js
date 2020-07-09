const LogicLayer = require('./logiclayer')
const DataLayer = require('./datalayer')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const utility = require('../utility')

exports.getAllPages = function (req, res) {
  let criterias = LogicLayer.getAllPagesCriteria(req.params.userid, req.body)
  utility.callApi(`pages/aggregate`, 'post', criterias.countCriteria) // fetch connected pages count
    .then(count => {
      utility.callApi(`pages/aggregate`, 'post', criterias.finalCriteria) // fetch connected pages
        .then(pages => {
          let pagesPayload = []
          for (let i = 0; i < pages.length; i++) {
            let subscribers = pages[i].subscribers.filter(subscriber => subscriber.isSubscribed === true)
            pagesPayload.push({
              _id: pages[i]._id,
              pageId: pages[i].pageId,
              pageName: pages[i].pageName,
              userId: pages[i].userId,
              pagePic: pages[i].pagePic,
              connected: pages[i].connected,
              pageUserName: pages[i].pageUserName,
              isApproved: pages[i].isApproved,
              likes: pages[i].likes,
              subscribers: subscribers.length
            })
          }
          let payload = {
            pages: pagesPayload,
            count: pagesPayload.length > 0 ? count[0].count : ''
          }
          sendSuccessResponse(res, 200, payload)
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch pages ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch pages count ${JSON.stringify(error)}`)
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
          sendErrorResponse(res, 500, `Failed to fetch broadcasts ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
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
          sendErrorResponse(res, 500, `Failed to polls ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
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
      sendErrorResponse(res, 500, '', `Error in getting messages count ${err}`)
    })
}
