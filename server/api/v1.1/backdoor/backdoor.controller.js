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
var json2csv = require('json2csv')
const config = require('./../../../config/environment/index')
const { parse } = require('json2csv')
const AutopostingMessagesDataLayer = require('../autopostingMessages/autopostingMessages.datalayer')
const AutopostingDataLayer = require('../autoposting/autoposting.datalayer')

exports.getAllUsers = function (req, res) {
  let criterias = LogicLayer.getCriterias(req.body)
  utility.callApi(`user/query`, 'post', criterias.findCriteria, req.headers.authorization)
    .then(usersData => {
      utility.callApi(`user/aggregate`, 'post', criterias.finalCriteria, req.headers.authorization)
        .then(users => {
          let usersPayload = []
          if (users.length > 0) {
            users.forEach((user) => {
              let pageIds = []
              utility.callApi(`pages/query`, 'post', {userId: user._id, connected: true}, req.headers.authorization)
                .then(pages => {
                  for (let i = 0; i < pages.length; i++) {
                    pageIds.push(pages[i]._id)
                  }
                  utility.callApi(`subscribers/query`, 'post', {pageId: pageIds, isSubscribed: true, isEnabledByPage: true}, req.headers.authorization)
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
                        res.status(200).json({
                          status: 'success',
                          payload: {users: sorted.reverse(), count: usersData.length}
                        })
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
            res.status(200).json({
              status: 'success',
              payload: {users: [], count: usersData.length}
            })
          }
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch users aggregate ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch users ${JSON.stringify(error)}`})
    })
}
exports.getAllPages = function (req, res) {
  let criterias = LogicLayer.getAllPagesCriteria(req.params.userid, req.body)
  utility.callApi(`pages/aggregate`, 'post', criterias.countCriteria, req.headers.authorization) // fetch connected pages count
    .then(count => {
      utility.callApi(`pages/aggregate`, 'post', criterias.finalCriteria, req.headers.authorization) // fetch connected pages
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
          res.status(200).json({
            status: 'success',
            payload: {pages: pagesPayload, count: pagesPayload.length > 0 ? count[0].count : ''}
          })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch pages ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch pages count ${JSON.stringify(error)}`})
    })
}
exports.allLocales = function (req, res) {
  utility.callApi(`user/distinct`, 'post', {distinct: 'facebookInfo.locale'}, req.headers.authorization)
    .then(locales => {
      res.status(200).json({
        status: 'success',
        payload: locales
      })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch locales ${JSON.stringify(error)}`})
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
          res.status(200).json({
            status: 'success',
            payload: {broadcasts: broadcasts, count: broadcasts.length > 0 ? broadcastsCount[0].count : ''}
          })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch broadcasts ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch broadcasts count ${JSON.stringify(error)}`})
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
          res.status(200).json({
            status: 'success',
            payload: {polls: polls, count: polls.length > 0 ? pollsCount[0].count : ''}
          })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to polls ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch polls count ${JSON.stringify(error)}`})
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
          res.status(200).json({
            status: 'success',
            payload: {surveys: surveys, count: surveys.length > 0 ? surveysCount[0].count : ''}
          })
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
                return res.status(200)
                  .json({
                    status: 'success',
                    payload: {broadcasts: result.data, count: result.data.length > 0 ? broadcastsCount[0].count : ''}
                  })
              })
          } else {
            return res.status(200)
              .json({
                status: 'success',
                payload: {broadcasts: [], count: ''}
              })
          }
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch broadcasts ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch broadcasts count ${JSON.stringify(error)}`})
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
                return res.status(200)
                  .json({
                    status: 'success',
                    payload: {polls: result.data, count: result.data.length > 0 ? pollsCount[0].count : ''}
                  })
              })
          } else {
            return res.status(200)
              .json({
                status: 'success',
                payload: {polls: [], count: ''}
              })
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
                return res.status(200)
                  .json({
                    status: 'success',
                    payload: {surveys: result.data, count: result.data.length > 0 ? surveysCount[0].count : ''}
                  })
              })
          } else {
            return res.status(200)
              .json({
                status: 'success',
                payload: {surveys: [], count: ''}
              })
          }
        })
    })
}

function prepareSurveyDataToSend (surveys, req) {
  return new Promise(function (resolve, reject) {
    let data = []
    for (let j = 0; j < surveys.length; j++) {
      let pagesurveyTapped = surveys[j].surveyPages.filter((c) => c.seen === true)
      utility.callApi(`user/query`, 'post', {_id: surveys[j].userId}, req.headers.authorization)
        .then(user => {
          utility.callApi(`pages/query`, 'post', {companyId: surveys[j].companyId}, req.headers.authorization)
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
      utility.callApi(`user/query`, 'post', {_id: polls[j].userId}, req.headers.authorization)
        .then(user => {
          utility.callApi(`pages/query`, 'post', {companyId: polls[j].companyId}, req.headers.authorization)
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
      utility.callApi(`user/query`, 'post', {_id: broadcasts[j].userId}, req.headers.authorization)
        .then(user => {
          utility.callApi(`pages/query`, 'post', {companyId: broadcasts[j].companyId}, req.headers.authorization)
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
      return res.status(200)
        .json({status: 'success', payload: {broadcastsgraphdata}})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch broadcasts ${JSON.stringify(error)}`})
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
      return res.status(200)
        .json({status: 'success', payload: {pollsgraphdata}})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch polls ${JSON.stringify(error)}`})
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
      return res.status(200)
        .json({status: 'success', payload: {surveysgraphdata}})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch surveys ${JSON.stringify(error)}`})
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
  utility.callApi(`subscribers/aggregate`, 'post', body, req.headers.authorization)
    .then(sessionsgraphdata => {
      return res.status(200)
        .json({status: 'success', payload: {sessionsgraphdata}})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch sessions ${JSON.stringify(error)}`})
    })
}
exports.getAllSubscribers = function (req, res) {
  let criteria = LogicLayer.getAllSubscribersCriteria(req.params.pageid, req.body)
  utility.callApi(`subscribers/aggregate`, 'post', criteria.countCriteria, req.headers.authorization)
    .then(subscribersCount => {
      utility.callApi(`subscribers/aggregate`, 'post', criteria.finalCriteria, req.headers.authorization)
        .then(subscribers => {
          res.status(200).json({
            status: 'success',
            payload: {subscribers: subscribers, count: subscribers.length > 0 ? subscribersCount[0].count : ''}
          })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch subscribers ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch subscribers count ${JSON.stringify(error)}`})
    })
}
exports.poll = function (req, res) {
  DataLayer.findOnePoll(req.params.pollid)
    .then(poll => {
      PollResponseDataLayer.genericFindForPollResponse({pollId: req.params.pollid})
        .then(pollResponses => {
          PollPageDataLayer.genericFind({pollId: req.params.pollid})
            .then(pollpages => {
              return res.status(200)
                .json({status: 'success', payload: {pollResponses, poll, pollpages}})
            })
            .catch(error => {
              return res.status(500).json({status: 'failed', payload: `Failed to fetch poll pages ${JSON.stringify(error)}`})
            })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch poll responses ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch poll ${JSON.stringify(error)}`})
    })
}
exports.surveyDetails = function (req, res) {
  DataLayer.findSurvey({_id: req.params.surveyid})
    .then(survey => {
      SurveyQuestionDataLayer.findSurveyWithId(req.params.surveyid)
        .then(questions => {
          SurveyResponseDataLayer.genericFind({surveyId: req.params.surveyid})
            .then(responses => {
              return res.status(200)
                .json({status: 'success', payload: {survey, questions, responses}})
            })
            .catch(error => {
              return res.status(500).json({status: 'failed', payload: `Failed to fetch survey responses ${JSON.stringify(error)}`})
            })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch survey questions ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch survey ${JSON.stringify(error)}`})
    })
}
exports.uploadFile = function (req, res) {
  utility.callApi(`user/query`, 'post', {}, req.headers.authorization)
    .then(users => {
      utility.callApi(`pages/query`, 'post', {}, req.headers.authorization)
        .then(pages => {
          downloadCSV(pages, req)
            .then(result => {
              res.status(200).json({
                status: 'success',
                payload: result.data
              })
            })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch pages ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch users ${JSON.stringify(error)}`})
    })
}

exports.AllSubscribers = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization) // fetch company user
    .then(companyuser => {
      utility.callApi(`subscribers/query`, 'post', {pageId: req.params.pageid}, req.headers.authorization) // fetch subscribers of company
        .then(subscribers => {
          console.log('subscribers in All subscribers', subscribers)
          downloadSubscribersData(subscribers)
            .then(result => {
              res.status(200).json({
                status: 'success',
                payload: result.data
              })
            })
        }) 
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch subscribers ${JSON.stringify(error)}`
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

function downloadSubscribersData (subscribers) {
  let subscriberPayload = []
  return new Promise(function (resolve, reject) { 
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
  })
}

function downloadCSV (pages, req) {
  return new Promise(function (resolve, reject) {
    let usersPayload = []
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].userId) {
        utility.callApi(`subscribers/query`, 'post', {pageId: pages[i]._id, isEnabledByPage: true, isSubscribed: true}, req.headers.authorization)
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
  utility.callApi(`user/query`, 'post', {}, req.headers.authorization)
    .then(users => {
      users.forEach((user) => {
        let data = {
          subscribers: 0,
          polls: 0,
          broadcasts: 0,
          surveys: 0,
          liveChat: 0
        }
        utility.callApi(`companyUser/query`, 'post', {domain_email: user.domain_email}, req.headers.authorization)
          .then(companyUser => {
            utility.callApi(`subscribers/query`, 'post', {isSubscribed: true, isEnabledByPage: true}, req.headers.authorization)
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
                  utility.callApi(`subscribers/aggregate`, 'post', subscriberAggregate, req.headers.authorization)
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
  let criteriaForFacebook = LogicLayer.getCriteriasForAutopostingByType(req.body, 'facebook')
  let criteriaForTwitter = LogicLayer.getCriteriasForAutopostingByType(req.body, 'twitter')
  let criteriaForWordpress = LogicLayer.getCriteriasForAutopostingByType(req.body, 'wordpress')
  AutopostingDataLayer.findAutopostingUsingAggregateForKiboDash(criteriaForFacebook.matchAggregate, criteriaForFacebook.groupAggregate)
    .then(facebookAutoposting => {
      AutopostingDataLayer.findAutopostingUsingAggregateForKiboDash(criteriaForTwitter.matchAggregate, criteriaForTwitter.groupAggregate)
        .then(twitterAutoposting => {
          AutopostingDataLayer.findAutopostingUsingAggregateForKiboDash(criteriaForWordpress.matchAggregate, criteriaForWordpress.groupAggregate)
            .then(wordpressAutoposting => {
              let groupAggregate = {
                _id: '$message_id',
                count: {$sum: 1},
                sent: {$sum: '$sent'}
              }
              criteriaForFacebook = LogicLayer.getCriteriasForAutopostingByTypethatCame(req.body, 'facebook')
              criteriaForTwitter = LogicLayer.getCriteriasForAutopostingByTypethatCame(req.body, 'twitter')
              criteriaForWordpress = LogicLayer.getCriteriasForAutopostingByTypethatCame(req.body, 'wordpress')
              AutopostingMessagesDataLayer.findAutopostingMessageUsingAggregateForKiboDash(criteriaForFacebook.matchAggregate, groupAggregate)
                .then(facebookAutopostingsCame => {
                  let facebookAutopostingsSent = facebookAutopostingsCame.length > 0 ? facebookAutopostingsCame.reduce((a, b) => a + b.sent, 0) : 0
                  AutopostingMessagesDataLayer.findAutopostingMessageUsingAggregateForKiboDash(criteriaForTwitter.matchAggregate, groupAggregate)
                    .then(twitterAutopostingsCame => {
                      let twitterAutopostingsSent = twitterAutopostingsCame.length > 0 ? twitterAutopostingsCame.reduce((a, b) => a + b.sent, 0) : 0
                      AutopostingMessagesDataLayer.findAutopostingMessageUsingAggregateForKiboDash(criteriaForWordpress.matchAggregate, groupAggregate)
                        .then(wordpressAutopostingsCame => {
                          let wordpressAutopostingsSent = wordpressAutopostingsCame.length > 0 ? wordpressAutopostingsCame.reduce((a, b) => a + b.sent, 0) : 0
                          groupAggregate = {
                            _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
                            count: {$sum: '$sent'}}
                          AutopostingMessagesDataLayer.findAutopostingMessageUsingAggregateForKiboDash(criteriaForFacebook.matchAggregate, groupAggregate)
                            .then(facebookAutopostingGraph => {
                              AutopostingMessagesDataLayer.findAutopostingMessageUsingAggregateForKiboDash(criteriaForTwitter.matchAggregate, groupAggregate)
                                .then(twitterAutopostingGraph => {
                                  let twitterAutopostingsSent = twitterAutopostingsCame.length > 0 ? twitterAutopostingsCame.reduce((a, b) => a + b.sent, 0) : 0
                                  AutopostingMessagesDataLayer.findAutopostingMessageUsingAggregateForKiboDash(criteriaForWordpress.matchAggregate, groupAggregate)
                                    .then(wordpressAutopostingGraph => {
                                      return res.status(200).json({
                                        status: 'success',
                                        payload: {
                                          facebookAutoposting: facebookAutoposting.length > 0 ? facebookAutoposting[0].count : 0,
                                          twitterAutoposting: twitterAutoposting.length > 0 ? twitterAutoposting[0].count : 0,
                                          wordpressAutoposting: wordpressAutoposting.length > 0 ? wordpressAutoposting[0].count : 0,
                                          facebookAutopostingsCame: facebookAutopostingsCame.length > 0 ? facebookAutopostingsCame.length : 0,
                                          twitterAutopostingsCame: twitterAutopostingsCame.length > 0 ? twitterAutopostingsCame.length : 0,
                                          wordpressAutopostingsCame: wordpressAutopostingsCame.length > 0 ? wordpressAutopostingsCame.length : 0,
                                          facebookAutopostingsSent,
                                          twitterAutopostingsSent,
                                          wordpressAutopostingsSent,
                                          facebookAutopostingGraph,
                                          twitterAutopostingGraph,
                                          wordpressAutopostingGraph
                                        }
                                      })
                                    })
                                    .catch(err => {
                                      return res.status(500).json({
                                        status: 'failed',
                                        description: `Failed to fetch wordpressAutopostingsCame ${err}`
                                      })
                                    })
                                })
                                .catch(err => {
                                  return res.status(500).json({
                                    status: 'failed',
                                    description: `Failed to fetch twitterAutopostingsCame ${err}`
                                  })
                                })
                            })
                            .catch(err => {
                              return res.status(500).json({
                                status: 'failed',
                                description: `Failed to fetch facebookAutopostingsCame ${err}`
                              })
                            })
                        })
                        .catch(err => {
                          return res.status(500).json({
                            status: 'failed',
                            description: `Failed to fetch wordpressAutopostingsCame ${err}`
                          })
                        })
                    })
                    .catch(err => {
                      return res.status(500).json({
                        status: 'failed',
                        description: `Failed to fetch twitterAutopostingsCame ${err}`
                      })
                    })
                })
                .catch(err => {
                  return res.status(500).json({
                    status: 'failed',
                    description: `Failed to fetch facebookAutopostingsCame ${err}`
                  })
                })
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `Failed to fetch wordpressAutoposting ${err}`
              })
            })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Failed to fetch twitterAutoposting ${err}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Failed to fetch facebookAutoposting ${err}`
      })
    })
}
