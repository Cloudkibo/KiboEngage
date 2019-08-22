const LogicLayer = require('./logiclayer')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/messengerEvents/delivery.controller'
const sortBy = require('sort-array')
const DataLayer = require('./datalayer')
const PollResponseDataLayer = require('../polls/pollresponse.datalayer')
const PollPageDataLayer = require('../page_poll/page_poll.datalayer')
const SurveyQuestionDataLayer = require('../surveys/surveyquestion.datalayer')
const SurveyResponseDataLayer = require('../surveys/surveyresponse.datalayer')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const config = require('./../../../config/environment/index')
const { parse } = require('json2csv')
const async = require('async')
const AutopostingMessagesDataLayer = require('../autopostingMessages/autopostingMessages.datalayer')
const AutopostingDataLayer = require('../autoposting/autoposting.datalayer')
const { facebookApiCaller } = require('../../global/facebookApiCaller')

exports.getAllUsers = function (req, res) {
  let criterias = LogicLayer.getCriterias(req.body)
  utility.callApi(`user/query`, 'post', criterias.findCriteria)
    .then(usersData => {
      utility.callApi(`user/aggregate`, 'post', criterias.finalCriteria)
        .then(users => {
          let usersPayload = []
          if (users.length > 0) {
            users.forEach((user) => {
              let pageIds = []
              utility.callApi(`pages/query`, 'post', {userId: user._id, connected: true})
                .then(pages => {
                  for (let i = 0; i < pages.length; i++) {
                    pageIds.push(pages[i]._id)
                  }
                  utility.callApi(`subscribers/query`, 'post', {pageId: pageIds, isSubscribed: true, isEnabledByPage: true})
                    .then(subscribers => {
                      usersPayload.push({
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        facebookInfo: user.facebookInfo ? user.facebookInfo : null,
                        createdAt: user.createdAt,
                        pages: pages.length,
                        subscribers: subscribers.length
                      })
                      if (usersPayload.length === users.length) {
                        let sorted = sortBy(usersPayload, 'createdAt')
                        sendSuccessResponse(res, 200, {users: sorted.reverse(), count: usersData.length})
                      }
                    })
                    .catch(error => {
                      logger.serverLog(TAG, `ERROR in fetching subscribers ${JSON.stringify(error)}`, 'error')
                    })
                })
                .catch(error => {
                  logger.serverLog(TAG, `ERROR in fetching pages ${JSON.stringify(error)}`, 'error')
                })
            })
          } else {
            sendSuccessResponse(res, 200, {users: [], count: usersData.length})
          }
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch users aggregate ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch users ${JSON.stringify(error)}`)
    })
}
exports.getAllPages = function (req, res) {
  let criterias = LogicLayer.getAllPagesCriteria(req.params.userid, req.body)
  utility.callApi(`pages/aggregate`, 'post', criterias.countCriteria) // fetch connected pages count
    .then(count => {
      utility.callApi(`pages/aggregate`, 'post', criterias.finalCriteria) // fetch connected pages
        .then(pages => {
          let pagesPayload = []
          for (let i = 0; i < pages.length; i++) {
            pagesPayload.push({
              _id: pages[i]._id,
              pageId: pages[i].pageId,
              pageName: pages[i].pageName,
              userId: pages[i].userId,
              pagePic: pages[i].pagePic,
              connected: pages[i].connected,
              pageUserName: pages[i].pageUserName,
              likes: pages[i].likes,
              subscribers: pages[i].subscribers.length
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
exports.allLocales = function (req, res) {
  utility.callApi(`user/distinct`, 'post', {distinct: 'facebookInfo.locale'})
    .then(locales => {
      sendSuccessResponse(res, 200, locales)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch locales ${JSON.stringify(error)}`)
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
exports.getAllBroadcasts = function (req, res) {
  let criteria = LogicLayer.getAllBroadcastsCriteria(req.body)
  DataLayer.countBroadcasts(criteria.countCriteria[0].$match)
    .then(broadcastsCount => {
      let aggregateLookup = criteria.finalCriteria[0].$lookup
      let aggregateMatch = criteria.finalCriteria[1].$match
      let aggregateSort = criteria.finalCriteria[2].$sort
      let aggregateSkip = criteria.finalCriteria[3].$skip
      let aggregateLimit = criteria.finalCriteria[4].$limit
      DataLayer.aggregateForBroadcasts(aggregateMatch, undefined, aggregateLookup, aggregateLimit, aggregateSort, aggregateSkip)
        .then(broadcasts => {
          if (broadcasts.length > 0) {
            prepareDataToSend(broadcasts, req)
              .then(result => {
                sendSuccessResponse(res, 200, {broadcasts: result.data, count: result.data.length > 0 ? broadcastsCount[0].count : ''})
              })
          } else {
            sendSuccessResponse(res, 200, {broadcasts: [], count: ''})
          }
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch broadcasts ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch broadcasts count ${JSON.stringify(error)}`)
    })
}

exports.getAllPolls = function (req, res) {
  let criteria = LogicLayer.getAllPollsCriteria(req.body)
  DataLayer.countPolls(criteria.countCriteria[0].$match)
    .then(pollsCount => {
      let aggregateLookup = criteria.finalCriteria[0].$lookup
      let aggregateMatch = criteria.finalCriteria[1].$match
      let aggregateSort = criteria.finalCriteria[2].$sort
      let aggregateSkip = criteria.finalCriteria[3].$skip
      let aggregateLimit = criteria.finalCriteria[4].$limit
      let aggregateLookup1 = criteria.finalCriteria[5].$lookup
      DataLayer.aggregateForPolls(aggregateMatch, undefined, aggregateLookup, aggregateLimit, aggregateSort, aggregateSkip, aggregateLookup1)
        .then(polls => {
          if (polls.length > 0) {
            preparePollDataToSend(polls, req)
              .then(result => {
                sendSuccessResponse(res, 200, {polls: result.data, count: result.data.length > 0 ? pollsCount[0].count : ''})
              })
          } else {
            sendSuccessResponse(res, 200, {polls: [], count: ''})
          }
        })
    })
}

exports.getAllSurveys = function (req, res) {
  let criteria = LogicLayer.getAllSurveysCriteria(req.body)
  DataLayer.countSurveys(criteria.countCriteria[0].$match)
    .then(surveysCount => {
      let aggregateLookup = criteria.finalCriteria[0].$lookup
      let aggregateMatch = criteria.finalCriteria[1].$match
      let aggregateSort = criteria.finalCriteria[2].$sort
      let aggregateSkip = criteria.finalCriteria[3].$skip
      let aggregateLimit = criteria.finalCriteria[4].$limit
      let aggregateLookup1 = criteria.finalCriteria[5].$lookup
      DataLayer.aggregateForSurveys(aggregateMatch, undefined, aggregateLookup, aggregateLimit, aggregateSort, aggregateSkip, aggregateLookup1)
        .then(surveys => {
          if (surveys.length > 0) {
            prepareSurveyDataToSend(surveys, req)
              .then(result => {
                sendSuccessResponse(res, 200, {surveys: result.data, count: result.data.length > 0 ? surveysCount[0].count : ''})
              })
          } else {
            sendSuccessResponse(res, 200, {surveys: [], count: ''})
          }
        })
    })
}

function prepareSurveyDataToSend (surveys, req) {
  return new Promise(function (resolve, reject) {
    let data = []
    for (let j = 0; j < surveys.length; j++) {
      let pagesurveyTapped = surveys[j].surveyPages.filter((c) => c.seen === true)
      utility.callApi(`user/query`, 'post', {_id: surveys[j].userId})
        .then(user => {
          utility.callApi(`pages/query`, 'post', {companyId: surveys[j].companyId})
            .then(pages => {
              let pageSend = []
              if (surveys[j].segmentationPageIds && surveys[j].segmentationPageIds.length > 0) {
                for (let k = 0; k < surveys[j].segmentationPageIds.length; k++) {
                  let page = pages.filter((c) => JSON.stringify(c.pageId) === JSON.stringify(surveys[j].segmentationPageIds[k]))
                  pageSend.push(page[0].pageName)
                }
              } else {
                let page = pages.filter((c) => c.connected === true)
                for (let a = 0; a < page.length; a++) {
                  pageSend.push(page[a].pageName)
                }
              }
              data.push({_id: surveys[j]._id,
                title: surveys[j].title,
                datetime: surveys[j].datetime,
                page: pageSend,
                user: user[0],
                sent: surveys[j].surveyPages.length,
                seen: pagesurveyTapped.length,
                responded: surveys[j].surveyResponses.length})
              if (data.length === surveys.length) {
                data.sort(function (a, b) {
                  return new Date(b.datetime) - new Date(a.datetime)
                })
                resolve({data: data})
              }
            })
        })
    }
  })
}

function preparePollDataToSend (polls, req) {
  return new Promise(function (resolve, reject) {
    let data = []
    for (let j = 0; j < polls.length; j++) {
      let pagepollTapped = polls[j].pollPages.filter((c) => c.seen === true)
      utility.callApi(`user/query`, 'post', {_id: polls[j].userId})
        .then(user => {
          utility.callApi(`pages/query`, 'post', {companyId: polls[j].companyId})
            .then(pages => {
              let pageSend = []
              if (polls[j].segmentationPageIds && polls[j].segmentationPageIds.length > 0) {
                for (let k = 0; k < polls[j].segmentationPageIds.length; k++) {
                  let page = pages.filter((c) => JSON.stringify(c.pageId) === JSON.stringify(polls[j].segmentationPageIds[k]))
                  pageSend.push(page[0].pageName)
                }
              } else {
                let page = pages.filter((c) => c.connected === true)
                for (let a = 0; a < page.length; a++) {
                  pageSend.push(page[a].pageName)
                }
              }
              data.push({_id: polls[j]._id,
                statement: polls[j].statement,
                datetime: polls[j].datetime,
                page: pageSend,
                user: user[0],
                sent: polls[j].pollPages.length,
                seen: pagepollTapped.length,
                responded: polls[j].pollResponses.length
              })
              if (data.length === polls.length) {
                data.sort(function (a, b) {
                  return new Date(b.datetime) - new Date(a.datetime)
                })
                resolve({data: data})
              }
            })
        })
    }
  })
}

function prepareDataToSend (broadcasts, req) {
  return new Promise(function (resolve, reject) {
    let data = []
    for (let j = 0; j < broadcasts.length; j++) {
      let pagebroadcastTapped = broadcasts[j].broadcastPages.filter((c) => c.seen === true)
      utility.callApi(`user/query`, 'post', {_id: broadcasts[j].userId})
        .then(user => {
          utility.callApi(`pages/query`, 'post', {companyId: broadcasts[j].companyId})
            .then(pages => {
              let pageSend = []
              if (pages.length > 0) {
                if (broadcasts[j].segmentationPageIds && broadcasts[j].segmentationPageIds.length > 0) {
                  for (let k = 0; k < broadcasts[j].segmentationPageIds.length; k++) {
                    // segmentationPageIds are actually local Ids, so we should compare using _id
                    // in place of pageId
                    let page = pages.filter((c) => JSON.stringify(c._id) === JSON.stringify(broadcasts[j].segmentationPageIds[k]))
                    pageSend.push(page[0].pageName)
                  }
                } else {
                  let page = pages.filter((c) => c.connected === true)
                  for (let a = 0; a < page.length; a++) {
                    pageSend.push(page[a].pageName)
                  }
                }
              }
              data.push({_id: broadcasts[j]._id,
                title: broadcasts[j].title,
                datetime: broadcasts[j].datetime,
                payload: broadcasts[j].payload,
                page: pageSend,
                user: user[0],
                sent: broadcasts[j].broadcastPages.length,
                seen: pagebroadcastTapped.length
              })
              if (data.length === broadcasts.length) {
                data.sort(function (a, b) {
                  return new Date(b.datetime) - new Date(a.datetime)
                })
                resolve({data: data})
              }
            })
        })
    }
  })
}
exports.broadcastsGraph = function (req, res) {
  var days = 0
  if (req.params.days === '0') {
    days = 10
  } else {
    days = req.params.days
  }
  let startDate = new Date() // Current date
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0) // Set the hour, minute and second components to 0
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let aggregateMatch = {
    'datetime': {$gte: startDate}
  }
  let aggregateGroup = {
    _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
    count: {$sum: 1}}
  DataLayer.aggregateForBroadcasts(aggregateMatch, aggregateGroup, undefined, undefined, undefined, undefined)
    .then(broadcastsgraphdata => {
      sendSuccessResponse(res, 200, {broadcastsgraphdata})
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch broadcasts ${JSON.stringify(error)}`)
    })
}
exports.pollsGraph = function (req, res) {
  var days = 0
  if (req.params.days === '0') {
    days = 10
  } else {
    days = req.params.days
  }
  let startDate = new Date() // Current date
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0) // Set the hour, minute and second components to 0
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let aggregateMatch = {
    'datetime': {$gte: startDate}
  }
  let aggregateGroup = {
    _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
    count: {$sum: 1}}
  DataLayer.aggregateForPolls(aggregateMatch, aggregateGroup, undefined, undefined, undefined, undefined)
    .then(pollsgraphdata => {
      sendSuccessResponse(res, 200, {pollsgraphdata})
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch polls ${JSON.stringify(error)}`)
    })
}
exports.surveysGraph = function (req, res) {
  var days = 0
  if (req.params.days === '0') {
    days = 10
  } else {
    days = req.params.days
  }
  let startDate = new Date() // Current date
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0) // Set the hour, minute and second components to 0
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let aggregateMatch = {
    'datetime': {$gte: startDate}
  }
  let aggregateGroup = {
    _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
    count: {$sum: 1}}
  DataLayer.aggregateForSurveys(aggregateMatch, aggregateGroup, undefined, undefined, undefined, undefined)
    .then(surveysgraphdata => {
      sendSuccessResponse(res, 200, {surveysgraphdata})
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch surveys ${JSON.stringify(error)}`)
    })
}
exports.sessionsGraph = function (req, res) {
  var days = 0
  if (req.params.days === '0') {
    days = 10
  } else {
    days = req.params.days
  }
  let startDate = new Date() // Current date
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0) // Set the hour, minute and second components to 0
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let body = [
    {
      $match: {'datetime': {$gte: startDate}}
    },
    {
      $group: {
        _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
        count: {$sum: 1}}
    }]
  utility.callApi(`subscribers/aggregate`, 'post', body)
    .then(sessionsgraphdata => {
      sendSuccessResponse(res, 200, {sessionsgraphdata})
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch sessions ${JSON.stringify(error)}`)
    })
}
exports.getAllSubscribers = function (req, res) {
  let criteria = LogicLayer.getAllSubscribersCriteria(req.params.pageid, req.body)
  utility.callApi(`subscribers/aggregate`, 'post', criteria.countCriteria)
    .then(subscribersCount => {
      utility.callApi(`subscribers/aggregate`, 'post', criteria.finalCriteria)
        .then(subscribers => {
          let payload = {
            subscribers: subscribers,
            count: subscribers.length > 0 ? subscribersCount[0].count : ''
          }
          sendSuccessResponse(res, 200, payload)
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch subscribers ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch subscribers count ${JSON.stringify(error)}`)
    })
}
exports.poll = function (req, res) {
  DataLayer.findOnePoll(req.params.pollid)
    .then(poll => {
      PollResponseDataLayer.genericFindForPollResponse({pollId: req.params.pollid})
        .then(pollResponses => {
          PollPageDataLayer.genericFind({pollId: req.params.pollid})
            .then(pollpages => {
              sendSuccessResponse(res, 200, {pollResponses, poll, pollpages})
            })
            .catch(error => {
              sendErrorResponse(res, 500, `Failed to fetch poll pages ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch poll responses ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch poll ${JSON.stringify(error)}`)
    })
}
exports.surveyDetails = function (req, res) {
  DataLayer.findSurvey({_id: req.params.surveyid})
    .then(survey => {
      SurveyQuestionDataLayer.findSurveyWithId(req.params.surveyid)
        .then(questions => {
          SurveyResponseDataLayer.genericFind({surveyId: req.params.surveyid})
            .then(responses => {
              sendSuccessResponse(res, 200, {survey, questions, responses})
            })
            .catch(error => {
              sendErrorResponse(res, 500, `Failed to fetch survey responses ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch survey questions ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch survey ${JSON.stringify(error)}`)
    })
}
exports.uploadFile = function (req, res) {
  utility.callApi(`user/query`, 'post', {})
    .then(users => {
      utility.callApi(`pages/query`, 'post', {})
        .then(pages => {
          downloadCSV(pages, req)
            .then(result => {
              sendSuccessResponse(res, 200, result.data)
            })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch pages ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch users ${JSON.stringify(error)}`)
    })
}

exports.AllSubscribers = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      utility.callApi(`subscribers/query`, 'post', {pageId: req.params.pageid}) // fetch subscribers of company
        .then(subscribers => {
          console.log('subscribers in All subscribers', subscribers)
          downloadSubscribersData(subscribers)
            .then(result => {
              sendSuccessResponse(res, 200, result.data)
            })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch subscribers ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

function downloadSubscribersData (subscribers) {
  let subscriberPayload = []
  return new Promise(function (resolve, reject) {
    if (subscribers.length > 0) {
      for (let i = 0; i < subscribers.length; i++) {
        subscriberPayload.push({
          Name: subscribers[i].firstName + ' ' + subscribers[i].lastName,
          Gender: subscribers[i].gender,
          Locale: subscribers[i].locale,
          PageName: subscribers[i].pageId.pageName
        })

        if (i === subscribers.length - 1) {
          var info = subscriberPayload
          var keys = []
          var val = info[0]

          for (var k in val) {
            var subKey = k
            keys.push(subKey)
          }
          const opts = { keys }
          try {
            const csv = parse(info, opts)
            resolve({data: csv})
          } catch (err) {
            console.error('error at parse', err)
          }
        }
      }
    } else {
      const opts = ['Name', 'Gender', 'Locale', 'PageName']
      try {
        const csv = parse([], opts)
        resolve({data: csv})
      } catch (err) {
        console.error('error at parse', err)
      }
    }
  })
}

function downloadCSV (pages, req) {
  return new Promise(function (resolve, reject) {
    let usersPayload = []
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].userId) {
        utility.callApi(`subscribers/query`, 'post', {pageId: pages[i]._id, isEnabledByPage: true, isSubscribed: true})
          .then(subscribers => {
            DataLayer.findBroadcasts({pageIds: pages[i].pageId})
              .then(broadcasts => {
                DataLayer.findSurvey({pageIds: pages[i].pageId})
                  .then(surveys => {
                    DataLayer.findPolls({pageIds: pages[i].pageId})
                      .then(polls => {
                        usersPayload.push({
                          Page: pages[i].pageName,
                          isConnected: pages[i].connected,
                          Name: pages[i].userId.name,
                          Gender: pages[i].userId.facebookInfo ? pages[i].userId.facebookInfo.gender : '',
                          Email: pages[i].userId.email,
                          Locale: pages[i].userId.facebookInfo ? pages[i].userId.facebookInfo.locale : '',
                          CreatedAt: pages[i].userId.createdAt,
                          Likes: pages[i].likes,
                          Subscribers: subscribers && subscribers.length > 0 ? subscribers.length : 0,
                          Broadcasts: broadcasts && broadcasts.length > 0 ? broadcasts.length : 0,
                          Surveys: surveys && surveys.length > 0 ? surveys.length : 0,
                          Polls: polls && polls.length > 0 ? polls.length : 0
                        })
                        if (i === pages.length - 1) {
                          var info = usersPayload
                          var keys = []
                          var val = info[0]

                          for (var k in val) {
                            var subKey = k
                            keys.push(subKey)
                          }
                          const opts = { keys }
                          try {
                            const csv = parse(info, opts)
                            resolve({data: csv})
                          } catch (err) {
                            console.error('error at parse', err)
                          }
                          // json2csv({ data: info, fields: keys }, function (err, csv) {
                          //   if (err) {
                          //     console.log('error at exporting', err)
                          //     logger.serverLog(TAG, `Error at exporting csv file ${JSON.stringify(err)}`, 'error')
                          //   }
                          //   console.log('csv in', csv)
                          //   resolve({data: csv})
                          // })
                        }
                      })
                      .catch(error => {
                        logger.serverLog(TAG, `Failed to fetch polls ${JSON.stringify(error)}`, 'error')
                      })
                  })
                  .catch(error => {
                    logger.serverLog(TAG, `Failed to fetch surveys ${JSON.stringify(error)}`, 'error')
                  })
              })
              .catch(error => {
                logger.serverLog(TAG, `Failed to fetch broadcasts ${JSON.stringify(error)}`, 'error')
              })
          })
          .catch(error => {
            logger.serverLog(TAG, `Failed to fetch subscribers ${JSON.stringify(error)}`, 'error')
          })
      }
    }
  })
}
exports.sendEmail = function (req, res) {
  var days = 7
  utility.callApi(`user/query`, 'post', {})
    .then(users => {
      users.forEach((user) => {
        let data = {
          subscribers: 0,
          polls: 0,
          broadcasts: 0,
          surveys: 0,
          liveChat: 0
        }
        utility.callApi(`companyUser/query`, 'post', {domain_email: user.domain_email})
          .then(companyUser => {
            utility.callApi(`subscribers/query`, 'post', {isSubscribed: true, isEnabledByPage: true})
              .then(subs => {
                if (subs.length > 1) {
                  let subscriberAggregate = [
                    {
                      $match: {
                        $and: [
                          {'datetime': {
                            $gte: new Date(
                              (new Date().getTime() - (days * 24 * 60 * 60 * 1000))),
                            $lt: new Date(
                              (new Date().getTime()))
                          }
                          }, {companyId: companyUser.companyId},
                          {isEnabledByPage: true}, {isSubscribed: true}]
                      }}
                  ]
                  utility.callApi(`subscribers/aggregate`, 'post', subscriberAggregate)
                    .then(subscribers => {
                      data.subscribers = subscribers.length
                      // if (subscribers.length > 50) {
                      DataLayer.aggregateForPolls({
                        $and: [
                          {'datetime': {
                            $gte: new Date(
                              (new Date().getTime() - (days * 24 * 60 * 60 * 1000))),
                            $lt: new Date(
                              (new Date().getTime()))
                          }
                          }, {companyId: companyUser.companyId}]
                      }, undefined, undefined, undefined, undefined, undefined)
                        .then(polls => {
                          data.polls = polls.length
                        })
                      DataLayer.aggregateForSurveys({
                        $and: [
                          {'datetime': {
                            $gte: new Date(
                              (new Date().getTime() - (days * 24 * 60 * 60 * 1000))),
                            $lt: new Date(
                              (new Date().getTime()))
                          }
                          }, {companyId: companyUser.companyId}]
                      }, undefined, undefined, undefined, undefined, undefined)
                        .then(surveys => {
                          data.surveys = surveys.length
                        })
                      DataLayer.aggregateForBroadcasts({
                        $and: [
                          {'datetime': {
                            $gte: new Date(
                              (new Date().getTime() - (days * 24 * 60 * 60 * 1000))),
                            $lt: new Date(
                              (new Date().getTime()))
                          }
                          }, {companyId: companyUser.companyId}]
                      }, undefined, undefined, undefined, undefined, undefined)
                        .then(broadcasts => {
                          let sendgrid = require('sendgrid')(config.sendgrid.username,
                            config.sendgrid.password)

                          let email = new sendgrid.Email({
                            to: user.email,
                            from: 'support@cloudkibo.com',
                            subject: 'KiboPush: Weekly Summary',
                            text: 'Welcome to KiboPush'
                          })
                          email.setHtml('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html data-editor-version="2" class="sg-campaigns" xmlns="http://www.w3.org/1999/xhtml"> <head> <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/> <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1"/> <meta http-equiv="X-UA-Compatible" content="IE=Edge"/><!--[if (gte mso 9)|(IE)]> <xml> <o:OfficeDocumentSettings> <o:AllowPNG/> <o:PixelsPerInch>96</o:PixelsPerInch> </o:OfficeDocumentSettings> </xml><![endif]--><!--[if (gte mso 9)|(IE)]> <style type="text/css"> body{width: 600px;margin: 0 auto;}table{border-collapse: collapse;}table, td{mso-table-lspace: 0pt;mso-table-rspace: 0pt;}img{-ms-interpolation-mode: bicubic;}</style><![endif]--> <style type="text/css"> body, p, div{font-family: arial; font-size: 14px;}body{color: #000000;}body a{color: #1188E6; text-decoration: none;}p{margin: 0; padding: 0;}table.wrapper{width:100% !important; table-layout: fixed; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; -moz-text-size-adjust: 100%; -ms-text-size-adjust: 100%;}img.max-width{max-width: 100% !important;}.column.of-2{width: 50%;}.column.of-3{width: 33.333%;}.column.of-4{width: 25%;}@media screen and (max-width:480px){.preheader .rightColumnContent, .footer .rightColumnContent{text-align: left !important;}.preheader .rightColumnContent div, .preheader .rightColumnContent span, .footer .rightColumnContent div, .footer .rightColumnContent span{text-align: left !important;}.preheader .rightColumnContent, .preheader .leftColumnContent{font-size: 80% !important; padding: 5px 0;}table.wrapper-mobile{width: 100% !important; table-layout: fixed;}img.max-width{height: auto !important; max-width: 480px !important;}a.bulletproof-button{display: block !important; width: auto !important; font-size: 80%; padding-left: 0 !important; padding-right: 0 !important;}.columns{width: 100% !important;}.column{display: block !important; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; margin-left: 0 !important; margin-right: 0 !important;}}</style> </head> <body> <center class="wrapper" data-link-color="#1188E6" data-body-style="font-size: 14px; font-family: arial; color: #000000; background-color: #ebebeb;"> <div class="webkit"> <table cellpadding="0" cellspacing="0" border="0" width="100%" class="wrapper" bgcolor="#ebebeb"> <tr> <td valign="top" bgcolor="#ebebeb" width="100%"> <table width="100%" role="content-container" class="outer" align="center" cellpadding="0" cellspacing="0" border="0"> <tr> <td width="100%"> <table width="100%" cellpadding="0" cellspacing="0" border="0"> <tr> <td><!--[if mso]> <center> <table><tr><td width="600"><![endif]--> <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width:600px;" align="center"> <tr> <td role="modules-container" style="padding: 0px 0px 0px 0px; color: #000000; text-align: left;" bgcolor="#ffffff" width="100%" align="left"> <table class="module preheader preheader-hide" role="module" data-type="preheader" border="0" cellpadding="0" cellspacing="0" width="100%" style="display: none !important; mso-hide: all; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0;"> <tr> <td role="module-content"> <p></p></td></tr></table> <table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;"> <tr> <td style="font-size:6px;line-height:10px;padding:35px 0px 0px 0px;background-color:#ffffff;" valign="top" align="center"> <img class="max-width" border="0" style="display:block;color:#000000;text-decoration:none;font-family:Helvetica, arial, sans-serif;font-size:16px;" width="600" height="100" src="https://marketing-image-production.s3.amazonaws.com/uploads/63fe9859761f80dce4c7d46736baaa15ca671ce6533ec000c93401c7ac150bbec5ddae672e81ff4f6686750ed8e3fad14a60fc562df6c6fdf70a6ef40b2d9c56.png" alt="Logo"> </td></tr></table> <table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;"> <tr> <td style="padding:18px 0px 18px 0px;line-height:22px;text-align:inherit;" height="100%" valign="top" bgcolor=""> <h1 style="text-align: center;"><span style="color:#B7451C;"><span style="font-size:20px;"><span style="font-family:arial,helvetica,sans-serif;">KiboPush Weekly Report</span></span></span></h1> </td></tr></table> <table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;"> <tr> <td style="padding:30px 045px 30px 45px;line-height:22px;text-align:inherit;" height="100%" valign="top" bgcolor=""> <div>Hello ' + user.name + ',</div><div>&nbsp;</div><div>Hope you are doing great&nbsp;:)</div><div>&nbsp;</div><div>You have become an important part of our community. You have been very active on KiboPush. We are very pleased to share the weekly report of your activities.</div><div>&nbsp;</div><ul><li>New Subscribers =&gt; ' + data.subscribers + '</li><li>New Broadcasts =&gt; ' + data.broadcasts + '</li><li>New Surveys =&gt; ' + data.surveys + '</li><li>New Polls =&gt; ' + data.polls + '</li></ul><div>If you have any queries, you can send message to our <a href="https://www.facebook.com/kibopush/" style="background-color: rgb(255, 255, 255); font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; font-family: arial; font-size: 14px;">&nbsp;Facebook Page</a>. Our admins will get back to you. Or, you can join our <a href="https://www.facebook.com/groups/kibopush/">Facebook Community</a>.</div><div>&nbsp;</div><div>Thank you for your continuous support!</div><div>&nbsp;</div><div>Regards,</div><div>KiboPush Team</div><div>CloudKibo</div></td></tr></table> <table class="module" role="module" data-type="social" align="right" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;"> <tbody> <tr> <td valign="top" style="padding:10px 0px 30px 0px;font-size:6px;line-height:10px;background-color:#f5f5f5;"> <table align="right"> <tbody> <tr> <td style="padding: 0px 5px;"> <a role="social-icon-link" href="https://www.facebook.com/kibopush/" target="_blank" alt="Facebook" data-nolink="false" title="Facebook " style="-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;display:inline-block;background-color:#3B579D;"> <img role="social-icon" alt="Facebook" title="Facebook " height="30" width="30" style="height: 30px, width: 30px" src="https://marketing-image-production.s3.amazonaws.com/social/white/facebook.png"/> </a> </td><td style="padding: 0px 5px;"> <a role="social-icon-link" href="https://twitter.com/kibodeveloper" target="_blank" alt="Twitter" data-nolink="false" title="Twitter " style="-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;display:inline-block;background-color:#7AC4F7;"> <img role="social-icon" alt="Twitter" title="Twitter " height="30" width="30" style="height: 30px, width: 30px" src="https://marketing-image-production.s3.amazonaws.com/social/white/twitter.png"/> </a> </td></tr></tbody> </table> </td></tr></tbody> </table> </td></tr></table><!--[if mso]> </td></tr></table> </center><![endif]--> </td></tr></table> </td></tr></table> </td></tr></table> </div></center> </body></html>')
                          sendgrid.send(email, function (err, json) {
                            if (err) {
                              logger.serverLog(TAG,
                                `Internal Server Error on sending email : ${JSON.stringify(
                                  err)}`, 'error')
                            }
                          })
                        // }
                        })
                    })
                    .catch(error => {
                      logger.serverLog(TAG, `Failed to aggregate subscribers ${JSON.stringify(error)}`, 'error')
                    })
                }
              })
              .catch(error => {
                logger.serverLog(TAG, `Failed to fetch subscribers ${JSON.stringify(error)}`, 'error')
              })
          })
          .catch(error => {
            logger.serverLog(TAG, `Failed to fetch company user ${JSON.stringify(error)}`, 'error')
          })
      })
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to fetch users ${JSON.stringify(error)}`, 'error')
    })
  return res.status(200)
    .json({status: 'success'})
}
exports.fetchAutopostingDetails = function (req, res) {
  const criteria = LogicLayer.getCriteriasForAutopostingByType(req)
  const postCriteria = LogicLayer.getFbPostsCriteria(req)
  const cameCriteria = {
    facebook: LogicLayer.getCriteriasForAutopostingByTypethatCame(req, 'facebook'),
    twitter: LogicLayer.getCriteriasForAutopostingByTypethatCame(req, 'twitter'),
    wordpress: LogicLayer.getCriteriasForAutopostingByTypethatCame(req, 'wordpress')
  }
  const groupCriteraType = {
    _id: '$subscriptionType',
    count: {$sum: 1},
    forwarded: {$sum: '$tweetsForwarded'},
    ignored: {$sum: '$tweetsIgnored'}
  }
  const groupCriteriaMessages = {
    _id: '$message_id',
    count: {$sum: 1},
    sent: {$sum: '$sent'}
  }
  const groupCriteriaGraph = {
    _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
    count: {$sum: '$sent'}
  }

  async.parallelLimit([
    function (callback) {
      AutopostingDataLayer.findAutopostingUsingAggregateForKiboDash(criteria, groupCriteraType)
        .then(autoposting => {
          callback(null, autoposting)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      AutopostingMessagesDataLayer.findAutopostingMessageUsingAggregateForKiboDash(cameCriteria.facebook, groupCriteriaMessages)
        .then(facebookAutopostingsCame => {
          callback(null, facebookAutopostingsCame)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      AutopostingMessagesDataLayer.findAutopostingMessageUsingAggregateForKiboDash(cameCriteria.twitter, groupCriteriaMessages)
        .then(twitterAutopostingsCame => {
          callback(null, twitterAutopostingsCame)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      AutopostingMessagesDataLayer.findAutopostingMessageUsingAggregateForKiboDash(cameCriteria.wordpress, groupCriteriaMessages)
        .then(wordpressAutopostingsCame => {
          callback(null, wordpressAutopostingsCame)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      AutopostingMessagesDataLayer.findAutopostingMessageUsingAggregateForKiboDash(cameCriteria.facebook, groupCriteriaGraph)
        .then(facebookAutopostingGraph => {
          callback(null, facebookAutopostingGraph)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      AutopostingMessagesDataLayer.findAutopostingMessageUsingAggregateForKiboDash(cameCriteria.twitter, groupCriteriaGraph)
        .then(twitterAutopostingGraph => {
          callback(null, twitterAutopostingGraph)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      AutopostingMessagesDataLayer.findAutopostingMessageUsingAggregateForKiboDash(cameCriteria.wordpress, groupCriteriaGraph)
        .then(wordpressAutopostingGraph => {
          callback(null, wordpressAutopostingGraph)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      utility.callApi('autoposting_fb_post/query', 'post', postCriteria, 'kiboengage')
        .then(postsInfo => {
          callback(null, postsInfo)
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        description: `Failed to fetch autoposting analytics ${err}`
      })
    } else {
      let types = results[0].map((t) => t._id)
      let facebookIndex = types.indexOf('facebook')
      let twitterIndex = types.indexOf('twitter')
      let wordpressIndex = types.indexOf('wordpress')
      let payload = {
        facebookAutoposting: results[0].length > 0 && facebookIndex !== -1 ? results[0][facebookIndex].count : 0,
        twitterAutoposting: results[0].length > 0 && twitterIndex !== -1 ? results[0][twitterIndex].count : 0,
        wordpressAutoposting: results[0].length > 0 && wordpressIndex !== -1 ? results[0][wordpressIndex].count : 0,
        facebookAutopostingsCame: results[1].length > 0 ? results[1].length : 0,
        twitterAutopostingsCame: results[2].length > 0 ? results[2].length : 0,
        wordpressAutopostingsCame: results[3].length > 0 ? results[3].length : 0,
        facebookAutopostingsSent: results[1].length > 0 ? results[1].reduce((a, b) => a + b.sent, 0) : 0,
        twitterAutopostingsSent: results[2].length > 0 ? results[2].reduce((a, b) => a + b.sent, 0) : 0,
        wordpressAutopostingsSent: results[3].length > 0 ? results[3].reduce((a, b) => a + b.sent, 0) : 0,
        facebookAutopostingGraph: results[4],
        twitterAutopostingGraph: results[5],
        wordpressAutopostingGraph: results[6],
        tweetsForwarded: results[0].length > 0 ? results[0][twitterIndex].forwarded : 0,
        tweetsIgnored: results[0].length > 0 ? results[0][twitterIndex].ignored : 0,
        posts: results[7].length > 0 ? results[7][0].count : 0,
        likes: results[7].length > 0 ? results[7][0].likes : 0,
        comments: results[7].length > 0 ? results[7][0].comments : 0
      }
      return res.status(200).json({
        status: 'success',
        payload
      })
    }
  })
}
exports.getPagePermissions = function (req, res) {
  utility.callApi(`pages/query`, 'post', { _id: req.params.id })
    .then(page => {
      page = page[0]
      let appLevelPermissions = {
        email: false,
        manage_pages: false,
        pages_show_list: false,
        publish_pages: false,
        pages_messaging: false,
        pages_messaging_phone_number: false,
        pages_messaging_subscriptions: false,
        public_profile: false
      }
      let pageLevelPermissions = {
        subscription_messaging: 'Not Applied'
      }
      async.parallelLimit([
        function (callback) {
          facebookApiCaller('v4.0', `debug_token?input_token=${page.accessToken}&access_token=${page.accessToken}`, 'get', {})
            .then(response => {
              if (response.body && response.body.data && response.body.data.scopes) {
                if (response.body.data.scopes.length > 0) {
                  for (let i = 0; i < response.body.data.scopes.length; i++) {
                    appLevelPermissions[`${response.body.data.scopes[i]}`] = true
                    if (i === response.body.data.scopes.length - 1) {
                      callback(null, appLevelPermissions)
                    }
                  }
                } else {
                  callback(null, appLevelPermissions)
                }
              } else {
                callback(response.body.error)
              }
            })
            .catch(err => {
              callback(err)
            })
        },
        function (callback) {
          facebookApiCaller('v4.0', `me/messaging_feature_review?access_token=${page.accessToken}`, 'get', {})
            .then(response => {
              if (response.body && response.body.data) {
                if (response.body.data.length > 0) {
                  for (let i = 0; i < response.body.data.length; i++) {
                    pageLevelPermissions[`${response.body.data[i].feature}`] = response.body.data[i].status
                    if (i === response.body.data.length - 1) {
                      callback(null, pageLevelPermissions)
                    }
                  }
                } else {
                  callback(null, pageLevelPermissions)
                }
              } else {
                callback(response.body.error)
              }
            })
            .catch(err => {
              callback(err)
            })
        }
      ], 10, function (err, results) {
        if (err) {
          return res.status(500).json({
            status: 'failed',
            description: `Failed to fetch page permissions ${err}`
          })
        } else {
          sendSuccessResponse(res, 200, {appLevelPermissions: results[0], pageLevelPermissions: results[1]})
        }
      })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch page ${JSON.stringify(error)}`)
    })
}

exports.fetchUniquePages = (req, res) => {
  let aggregation = [
    {
      '$lookup': {
        from: 'tags',
        localField: '_id',
        foreignField: 'pageId',
        as: 'tag'
      }
    },
    {
      '$lookup': {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      '$unwind': '$user'
    },
    {
      '$group': {
        '_id': '$pageId',
        'count': { '$sum': 1 },
        'pageName': {'$first': '$pageName'},
        'page_ids': {'$push': '$_id'},
        'users': {'$push': '$user'},
        'tags': {'$push': '$tag'}
      }
    },
    {
      '$sort': {'count': -1}
    },
    {
      '$project': {
        '_id': 0,
        'pageId': '$_id',
        'count': '$count',
        'pageName': 1,
        'page_ids': 1,
        'users': 1,
        'tags': 1
      }
    },
    {
      '$match': req.body.pageName ? {'pageName': req.body.pageName} : {}
    },
    {
      '$skip': req.body.pageNumber ? (req.body.pageNumber - 1) * 10 : 0
    },
    {
      '$limit': 10
    }
  ]
  utility.callApi(`pages/aggregate`, 'post', aggregation, 'accounts', req.headers.authorization)
    .then(uniquePages => {
      // console.log('uniquePages', uniquePages)
      for (let i = 0; i < uniquePages.length; i++) {
        uniquePages[i].tags = [].concat.apply([], uniquePages[i].tags)
      }
      return res.status(200).json({
        status: 'success',
        payload: uniquePages
      })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch unique pages ${err}`, 'debug')
      return res.status(500).json({
        status: 'failed',
        description: `Failed to fetch unique pages ${err}`
      })
    })
}
exports.fetchPageUsers = (req, res) => {
  let criterias = LogicLayer.getPageUsersCriteria(req.body)
  utility.callApi(`pages/aggregate`, 'post', criterias.countCriteria, 'accounts', req.headers.authorization)
    .then(pagesCount => {
      utility.callApi(`pages/aggregate`, 'post', criterias.finalCriteria, 'accounts', req.headers.authorization)
        .then(pageUsers => {
          sendSuccessResponse(res, 200, {count: pagesCount[0] ? pagesCount[0].count : 0, pageUsers: pageUsers})
        })
        .catch(err => {
          sendErrorResponse(res, 500, `Failed to fetch pages ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, `Failed to fetch page count ${JSON.stringify(err)}`)
    })
}
