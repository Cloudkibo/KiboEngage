const LogicLayer = require('./logiclayer')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/backdoor/backdoor.controller'
const sortBy = require('sort-array')
const DataLayer = require('./datalayer')
const PollResponseDataLayer = require('../polls/pollresponse.datalayer')
const PollPageDataLayer = require('../page_poll/page_poll.datalayer')
const SurveyPageDataLayer = require('../page_survey/page_survey.datalayer')
const SurveyQuestionDataLayer = require('../surveys/surveyquestion.datalayer')
const SurveyResponseDataLayer = require('../surveys/surveyresponse.datalayer')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const config = require('./../../../config/environment/index')
const { parse } = require('json2csv')
const async = require('async')
const AutopostingMessagesDataLayer = require('../autopostingMessages/autopostingMessages.datalayer')
const AutopostingDataLayer = require('../autoposting/autoposting.datalayer')
const sgMail = require('@sendgrid/mail')

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
                  utility.callApi(`subscribers/query`, 'post', {pageId: pageIds, isSubscribed: true, completeInfo: true})
                    .then(subscribers => {
                      usersPayload.push({
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        facebookInfo: user.facebookInfo ? user.facebookInfo : null,
                        createdAt: user.createdAt,
                        pages: pages.length,
                        subscribers: subscribers.length,
                        domain_email: user.domain_email,
                        companyId: user.companyId._id
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

exports.allLocales = function (req, res) {
  utility.callApi(`pages/query`, 'post', {_id: req.params.pageid, connected: true})
    .then(pages => {
      let page = pages[0]
      let aggregateObject = [
        { $match: {companyId: page.companyId} },
        { $group: { _id: null, locales: { $addToSet: '$locale' } } }
      ]
      utility.callApi(`subscribers/aggregate`, 'post', aggregateObject) // fetch subscribers locales
        .then(locales => {
          sendSuccessResponse(res, 200, locales[0].locales)
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch locales ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company pages ${JSON.stringify(error)}`)
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
      $match: {'datetime': {$gte: startDate}, completeInfo: true}
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
  var dt = new Date()
  var utcDate = dt.toUTCString()
  logger.serverLog(TAG, `starting function time ${utcDate}`, 'info')
  let criteria = LogicLayer.getAllSubscribersCriteria(req.params.pageid, req.body)
  utility.callApi(`subscribers/aggregate`, 'post', criteria.countCriteria)
    .then(subscribersCount => {
      dt = new Date()
      utcDate = dt.toUTCString()
      logger.serverLog(TAG, `subscribers/aggregate count ${utcDate}`, 'info')

      utility.callApi(`subscribers/aggregate`, 'post', criteria.finalCriteria)
        .then(subscribers => {
          dt = new Date()
          utcDate = dt.toUTCString()
          logger.serverLog(TAG, `subscribers/aggregate data subscribers ${utcDate}`, 'info')
          let payload = {
            subscribers: subscribers,
            count: subscribers.length > 0 ? subscribersCount[0].count : ''
          }
          dt = new Date()
          utcDate = dt.toUTCString()
          logger.serverLog(TAG, `before send success response ${utcDate}`, 'info')

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
              SurveyPageDataLayer.genericFind({surveyId: req.params.surveyid})
                .then(surveypages => {
                  survey[0].Sent = surveypages.length
                  sendSuccessResponse(res, 200, {survey, questions, responses})
                })
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

const _getPageData = (res, req, skipRecords, LimitRecords, data) => {
  let aggregateData = [
    {$skip: skipRecords},
    {$limit: LimitRecords},
    { $lookup: {from: 'users', localField: 'userId', foreignField: '_id', as: 'userId'} },
    { $unwind: '$userId' }
  ]
  utility.callApi(`pages/aggregate`, 'post', aggregateData)
    .then(pages => {
      logger.serverLog(TAG, `pages.length in _getPageData ${(pages.length)} `)
      if (pages.length > 0) {
        downloadCSV(pages, req)
          .then(result => {
            data = data.concat(result)
            skipRecords = skipRecords + 100
            _getPageData(res, req, skipRecords, LimitRecords, data)
          }).catch(error => {
            sendErrorResponse(res, 500, `Failed to download CSV DATA ${JSON.stringify(error)}`)
          })
      } else {
        var info = data
        var keys = []
        var val = info[0]
        for (var k in val) {
          var subKey = k
          keys.push(subKey)
        }
        const opts = { keys }
        try {
          const csv = parse(info, opts)
          sgMail.setApiKey(config.SENDGRID_API_KEY)
          var dataToSend = new Buffer(csv)
          let attachment = dataToSend.toString('base64')
          const msg = {
            to: req.user.email,
            from: 'support@cloudkibo.com',
            subject: 'KiboPush Data',
            text: 'Here is your requested KiboPush Data',
            attachments: [
              {
                content: attachment,
                filename: 'KiboPushData.csv',
                type: 'application/csv',
                disposition: 'attachment'
              }
            ]
          }
          sgMail.send(msg).catch(err => {
            console.log(JSON.stringify(err))
          })
        } catch (err) {
          logger.serverLog(TAG, `error at parse ${JSON.stringify(err)}`, 'error')
        }
      }
    }).catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch pages ${JSON.stringify(error)}`)
    })
}
exports.uploadFile = function (req, res) {
  utility.callApi(`user/query`, 'post', {})
    .then(users => {
      let data = []
      _getPageData(res, req, 0, 100, data)
      sendSuccessResponse(res, 200, {})
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch users ${JSON.stringify(error)}`)
    })
}

exports.AllSubscribers = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      utility.callApi(`subscribers/query`, 'post', {pageId: req.params.pageid, completeInfo: true}) // fetch subscribers of company
        .then(subscribers => {
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

const _findBroadcasts = (pageId, next) => {
  DataLayer.findBroadcasts({segmentationPageIds: pageId})
    .then(broadcasts => {
      next(null, broadcasts)
    })
    .catch(err => {
      next(err)
    })
}

const _findSurvey = (pageId, next) => {
  DataLayer.findSurvey({segmentationPageIds: pageId})
    .then(surveys => {
      next(null, surveys)
    })
    .catch(err => {
      next(err)
    })
}

const _findPolls = (pageId, next) => {
  DataLayer.findPolls({segmentationPageIds: pageId})
    .then(polls => {
      next(null, polls)
    })
    .catch(err => {
      next(err)
    })
}
function downloadCSV (pages, req) {
  return new Promise(function (resolve, reject) {
    let usersPayload = []
    let requests = []
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].userId) {
        requests.push(
          utility.callApi(`subscribers/query`, 'post', {pageId: pages[i]._id, isEnabledByPage: true, isSubscribed: true, completeInfo: true})
            .then(subscribers => {
              return new Promise((resolve, reject) => {
                async.parallelLimit([
                  _findBroadcasts.bind(null, pages[i].pageId),
                  _findSurvey.bind(null, pages[i].pageId),
                  _findPolls.bind(null, pages[i].pageId)
                ], 10, function (err, results) {
                  if (err) {
                    logger.serverLog(TAG, `Failed to fetch broadcasts ${JSON.stringify(err)}`, 'error')
                  } else {
                    let broadcasts = results[0]
                    let surveys = results[1]
                    let polls = results[2]
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
                  }
                  resolve('success')
                  // json2csv({ data: info, fields: keys }, function (err, csv) {
                  //   if (err) {
                  //     logger.serverLog(TAG, `Error at exporting csv file ${JSON.stringify(err)}`, 'error')
                  //   }
                  //   resolve({data: csv})
                  // })
                })
              })

                .catch(error => {
                  logger.serverLog(TAG, `Failed to fetch broadcasts ${JSON.stringify(error)}`, 'error')
                })
            })
            .catch(error => {
              logger.serverLog(TAG, `Failed to fetch subscribers ${JSON.stringify(error)}`, 'error')
            })
        )
      }
    }
    Promise.all(requests)
      .then(results => {
        resolve(usersPayload)
      })
  })
}

const _aggregateSubscribers = (data, next) => {
  utility.callApi(`subscribers/query`, 'post', {isSubscribed: true, isEnabledByPage: true, completeInfo: true})
    .then(subs => {
      if (subs.length > 1) {
        var days = 7
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
                }, {companyId: data.companyUser.companyId},
                {isEnabledByPage: true}, {isSubscribed: true}, {completeInfo: true}]
            }}
        ]
        utility.callApi(`subscribers/aggregate`, 'post', subscriberAggregate)
          .then(subscribers => {
            data.subscribers = subscribers.length
            next(null)
          })
          .catch(err => {
            logger.serverLog(TAG, `Unable to aggregate subscribers ${JSON.stringify(err)}`)
            next(err)
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Unable to query subscribers ${JSON.stringify(err)}`)
      next(err)
    })
}

const _aggregatePoll = (data, next) => {
  var days = 7
  DataLayer.aggregateForPolls({
    $and: [
      {'datetime': {
        $gte: new Date(
          (new Date().getTime() - (days * 24 * 60 * 60 * 1000))),
        $lt: new Date(
          (new Date().getTime()))
      }
      }, {companyId: data.companyUser.companyId}]
  }, undefined, undefined, undefined, undefined, undefined)
    .then(polls => {
      data.polls = polls.length
      next(null)
    })
    .catch(err => {
      logger.serverLog(`Unable to aggregate Polls ${err}`, err)
      next(err)
    })
}
const _aggregateSurvey = (data, next) => {
  var days = 7
  DataLayer.aggregateForSurveys({
    $and: [
      {'datetime': {
        $gte: new Date(
          (new Date().getTime() - (days * 24 * 60 * 60 * 1000))),
        $lt: new Date(
          (new Date().getTime()))
      }
      }, {companyId: data.companyUser.companyId}]
  }, undefined, undefined, undefined, undefined, undefined)
    .then(surveys => {
      data.surveys = surveys.length
      next(null)
    })
    .catch(err => {
      logger.serverLog(`Unable to aggregate Surveys ${err}`, err)
      next(err)
    })
}
const _aggregateBroadcast = (data, next) => {
  var days = 7
  DataLayer.aggregateForBroadcasts({
    $and: [
      {'datetime': {
        $gte: new Date(
          (new Date().getTime() - (days * 24 * 60 * 60 * 1000))),
        $lt: new Date(
          (new Date().getTime()))
      }
      }, {companyId: data.companyUser.companyId}]
  }, undefined, undefined, undefined, undefined, undefined)
    .then(broadcasts => {
      data.broadcasts = broadcasts.length
      next(null)
    })
    .catch(err => {
      logger.serverLog(`Unable to aggregate Broadcasts ${err}`, err)
      next(err)
    })
}

function calculateSummary (messages, item, callback) {
  logger.serverLog(TAG, `foreach ${JSON.stringify(item.email)}`)
  utility.callApi(`companyUser/query`, 'post', {domain_email: item.domain_email})
    .then(companyUser => {
      let data = {
        subscribers: 0,
        polls: 0,
        broadcasts: 0,
        surveys: 0,
        liveChat: 0,
        user: item,
        companyUser: companyUser
      }
      async.series([
        _aggregateSubscribers.bind(null, data),
        _aggregatePoll.bind(null, data),
        _aggregateBroadcast.bind(null, data),
        _aggregateSurvey.bind(null, data)
      ], function (err) {
        if (err) {
          callback(err)
        } else {
          let message = {
            to: item.email,
            from: 'support@cloudkibo.com',
            subject: 'KiboPush: Weekly Summary',
            text: 'Welcome to KiboPush'
          }
          logger.serverLog(`summary for ${item.domain_email} - Subscribers:${data.subscribers}, Polls:${data.polls}, Surveys:${data.surveys}, Broadcasts: ${data.broadcasts}`)
          message.html = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html data-editor-version="2" class="sg-campaigns" xmlns="http://www.w3.org/1999/xhtml"> <head> <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/> <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1"/> <meta http-equiv="X-UA-Compatible" content="IE=Edge"/><!--[if (gte mso 9)|(IE)]> <xml> <o:OfficeDocumentSettings> <o:AllowPNG/> <o:PixelsPerInch>96</o:PixelsPerInch> </o:OfficeDocumentSettings> </xml><![endif]--><!--[if (gte mso 9)|(IE)]> <style type="text/css"> body{width: 600px;margin: 0 auto;}table{border-collapse: collapse;}table, td{mso-table-lspace: 0pt;mso-table-rspace: 0pt;}img{-ms-interpolation-mode: bicubic;}</style><![endif]--> <style type="text/css"> body, p, div{font-family: arial; font-size: 14px;}body{color: #000000;}body a{color: #1188E6; text-decoration: none;}p{margin: 0; padding: 0;}table.wrapper{width:100% !important; table-layout: fixed; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; -moz-text-size-adjust: 100%; -ms-text-size-adjust: 100%;}img.max-width{max-width: 100% !important;}.column.of-2{width: 50%;}.column.of-3{width: 33.333%;}.column.of-4{width: 25%;}@media screen and (max-width:480px){.preheader .rightColumnContent, .footer .rightColumnContent{text-align: left !important;}.preheader .rightColumnContent div, .preheader .rightColumnContent span, .footer .rightColumnContent div, .footer .rightColumnContent span{text-align: left !important;}.preheader .rightColumnContent, .preheader .leftColumnContent{font-size: 80% !important; padding: 5px 0;}table.wrapper-mobile{width: 100% !important; table-layout: fixed;}img.max-width{height: auto !important; max-width: 480px !important;}a.bulletproof-button{display: block !important; width: auto !important; font-size: 80%; padding-left: 0 !important; padding-right: 0 !important;}.columns{width: 100% !important;}.column{display: block !important; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; margin-left: 0 !important; margin-right: 0 !important;}}</style> </head> <body> <center class="wrapper" data-link-color="#1188E6" data-body-style="font-size: 14px; font-family: arial; color: #000000; background-color: #ebebeb;"> <div class="webkit"> <table cellpadding="0" cellspacing="0" border="0" width="100%" class="wrapper" bgcolor="#ebebeb"> <tr> <td valign="top" bgcolor="#ebebeb" width="100%"> <table width="100%" role="content-container" class="outer" align="center" cellpadding="0" cellspacing="0" border="0"> <tr> <td width="100%"> <table width="100%" cellpadding="0" cellspacing="0" border="0"> <tr> <td><!--[if mso]> <center> <table><tr><td width="600"><![endif]--> <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width:600px;" align="center"> <tr> <td role="modules-container" style="padding: 0px 0px 0px 0px; color: #000000; text-align: left;" bgcolor="#ffffff" width="100%" align="left"> <table class="module preheader preheader-hide" role="module" data-type="preheader" border="0" cellpadding="0" cellspacing="0" width="100%" style="display: none !important; mso-hide: all; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0;"> <tr> <td role="module-content"> <p></p></td></tr></table> <table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;"> <tr> <td style="font-size:6px;line-height:10px;padding:35px 0px 0px 0px;background-color:#ffffff;" valign="top" align="center"> <img class="max-width" border="0" style="display:block;color:#000000;text-decoration:none;font-family:Helvetica, arial, sans-serif;font-size:16px;" width="600" height="100" src="https://marketing-image-production.s3.amazonaws.com/uploads/63fe9859761f80dce4c7d46736baaa15ca671ce6533ec000c93401c7ac150bbec5ddae672e81ff4f6686750ed8e3fad14a60fc562df6c6fdf70a6ef40b2d9c56.png" alt="Logo"> </td></tr></table> <table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;"> <tr> <td style="padding:18px 0px 18px 0px;line-height:22px;text-align:inherit;" height="100%" valign="top" bgcolor=""> <h1 style="text-align: center;"><span style="color:#B7451C;"><span style="font-size:20px;"><span style="font-family:arial,helvetica,sans-serif;">KiboPush Weekly Report</span></span></span></h1> </td></tr></table> <table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;"> <tr> <td style="padding:30px 045px 30px 45px;line-height:22px;text-align:inherit;" height="100%" valign="top" bgcolor=""> <div>Hello ' + item.name + ',</div><div>&nbsp;</div><div>Hope you are doing great&nbsp;:)</div><div>&nbsp;</div><div>You have become an important part of our community. We are pleased to share the weekly report of your activities.</div><div>&nbsp;</div><ul><li>New Subscribers =&gt; ' + data.subscribers + '</li><li>New Broadcasts =&gt; ' + data.broadcasts + '</li><li>New Surveys =&gt; ' + data.surveys + '</li><li>New Polls =&gt; ' + data.polls + '</li></ul><div>If you have any queries, you can send message to our <a href="https://www.facebook.com/kibopush/" style="background-color: rgb(255, 255, 255); font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; font-family: arial; font-size: 14px;">&nbsp;Facebook Page</a>. Our admins will get back to you. Or, you can join our <a href="https://www.facebook.com/groups/kibopush/">Facebook Community</a>.</div><div>&nbsp;</div><div>Thank you for your continuous support!</div><div>&nbsp;</div><div>Regards,</div><div>KiboPush Team</div><div>CloudKibo</div></td></tr></table> <table class="module" role="module" data-type="social" align="right" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;"> <tbody> <tr> <td valign="top" style="padding:10px 0px 30px 0px;font-size:6px;line-height:10px;background-color:#f5f5f5;"> <table align="right"> <tbody> <tr> <td style="padding: 0px 5px;"> <a role="social-icon-link" href="https://www.facebook.com/kibopush/" target="_blank" alt="Facebook" data-nolink="false" title="Facebook " style="-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;display:inline-block;background-color:#3B579D;"> <img role="social-icon" alt="Facebook" title="Facebook " height="30" width="30" style="height: 30px, width: 30px" src="https://marketing-image-production.s3.amazonaws.com/social/white/facebook.png"/> </a> </td><td style="padding: 0px 5px;"> <a role="social-icon-link" href="https://twitter.com/kibodeveloper" target="_blank" alt="Twitter" data-nolink="false" title="Twitter " style="-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;display:inline-block;background-color:#7AC4F7;"> <img role="social-icon" alt="Twitter" title="Twitter " height="30" width="30" style="height: 30px, width: 30px" src="https://marketing-image-production.s3.amazonaws.com/social/white/twitter.png"/> </a> </td></tr></tbody> </table> </td></tr></tbody> </table> </td></tr></table><!--[if mso]> </td></tr></table> </center><![endif]--> </td></tr></table> </td></tr></table> </td></tr></table> </div></center> </body></html>'
          messages.push(message)
          callback()
        }
      })
    })
    .catch(err => {
      callback(err)
    })
}
exports.weeklyEmail = function (req, res) {
  let countQuery = [
    { $match: {isSuperUser: true} },
    { $group: {_id: null, count: { $sum: 1 }} }
  ]
  const limit = 5
  let count = 0
  let match = {
    isSuperUser: true
  }
  utility.callApi(`user/aggregate`, 'post', countQuery)
    .then(result => {
      if (result[0]) {
        sendEmail(match, limit, count, result[0].count, res)
      } else {
        logger.serverLog('Unable to get count result')
      }
    })
    .catch(err => {
      sendErrorResponse(res, 500, `Failed to get users count ${JSON.stringify(err)}`)
    })
}

function sendEmail (match, limit, count, totalCount, res) {
  var criteria = [{$match: match}, {$limit: limit}]
  utility.callApi(`user/aggregate`, 'post', criteria)
  .then(users => {
    logger.serverLog('Users', users.length)
    let userData = users
    let messages = []
    if (userData) {
      async.each(users, calculateSummary.bind(null, messages), function (err) {
        if (err) {
         logger.serverLog(`Unable to calculate weekly summary ${err}`, 'error')
        } else {
          sgMail.setApiKey(config.SENDGRID_API_KEY);
          sgMail.send(messages).then(() => {
            logger.serverLog(TAG, `${JSON.stringify(match)}, ${limit}, ${count}, ${totalCount}`)
            if (count < totalCount) {
              match ={$and: [{isSuperUser: true}, {_id: {$gt: users[users.length -1]._id}}]}
              count = count + users.length
              sendEmail(match, limit, count, totalCount, res)
            } else {
              return sendSuccessResponse(res, 200, 'success')
            }
          }).catch(error => {
            sendErrorResponse(res, 500, `Failed to send weekly email ${JSON.stringify(error)}`)
          });
        }
      })
    }
  })
  .catch(err => {
    logger.serverLog(TAG, `Failed to fetch users ${err}`, 'error')
  })
}

exports.fetchAutopostingDetails = function (req, res) {
  const criteria = LogicLayer.getCriteriasForAutopostingByType(req)
  const postCriteria = LogicLayer.getFbPostsCriteria(req)
  const cameCriteria = {
    facebook: LogicLayer.getCriteriasForAutopostingByTypethatCame(req, 'facebook'),
    twitter: LogicLayer.getCriteriasForAutopostingByTypethatCame(req, 'twitter'),
    wordpress: LogicLayer.getCriteriasForAutopostingByTypethatCame(req, 'wordpress'),
    rss: LogicLayer.getCriteriasForAutopostingByTypethatCame(req, 'rss')

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
    },
    function (callback) {
      AutopostingMessagesDataLayer.findAutopostingMessageUsingAggregateForKiboDash(cameCriteria.rss, groupCriteriaMessages)
        .then(rssFeedAutopostingsCame => {
          callback(null, rssFeedAutopostingsCame)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      AutopostingMessagesDataLayer.findAutopostingMessageUsingAggregateForKiboDash(cameCriteria.rss, groupCriteriaGraph)
        .then(rssFeedAutopostingGraph => {
          callback(null, rssFeedAutopostingGraph)
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
      let rssIndex = types.indexOf('rss')
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
        tweetsForwarded: results[0].length > 0 && twitterIndex !== -1 ? results[0][twitterIndex].forwarded : 0,
        tweetsIgnored: results[0].length > 0 && twitterIndex !== -1 ? results[0][twitterIndex].ignored : 0,
        posts: results[7].length > 0 ? results[7][0].count : 0,
        likes: results[7].length > 0 ? results[7][0].likes : 0,
        comments: results[7].length > 0 ? results[7][0].comments : 0,
        rssFeedAutoposting: results[0].length > 0 && rssIndex !== -1 ? results[0][rssIndex].count : 0,
        rssFeedAutopostingCame: results[8].length > 0 ? results[8].length : 0,
        rssFeedAutopostingSent: results[8].length > 0 ? results[8].reduce((a, b) => a + b.sent, 0) : 0,
        rssFeedAutopostingGraph: results[9]
      }
      return res.status(200).json({
        status: 'success',
        payload
      })
    }
  })
}

exports.fetchUniquePages = (req, res) => {
  let aggregation = [
    {
      '$match': {
        pageName: req.body.pageName ? { $regex: '.*' + req.body.pageName + '.*', $options: 'i' } : {$exists: true},
        connectedFacebook: req.body.connectedFacebook !== '' ? req.body.connectedFacebook : {$exists: true}
      }
    },
    {
      '$group': {
        '_id': '$pageId',
        'count': { '$sum': 1 },
        'pageName': {'$first': '$pageName'},
        'connectedFacebook': {'$first': '$connectedFacebook'}
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
        connectedFacebook: 1
      }
    },
    {
      '$skip': req.body.pageNumber ? (req.body.pageNumber - 1) * 10 : 0
    },
    {
      '$limit': 10
    }
  ]

  let countAggregation = [
    {
      '$match': {
        pageName: req.body.pageName ? { $regex: '.*' + req.body.pageName + '.*', $options: 'i' } : {$exists: true},
        connectedFacebook: req.body.connectedFacebook !== '' ? req.body.connectedFacebook : {$exists: true}
      }
    },
    { '$group': {
      '_id': '$pageId'
    }},
    { '$group': {
      '_id': null,
      'count': {$sum: 1}
    }}
  ]
  utility.callApi(`pages/aggregate`, 'post', aggregation, 'accounts', req.headers.authorization)
    .then(uniquePages => {
      let pageOwnersFound = 0
      if (uniquePages.length > 0) {
        for (let i = 0; i < uniquePages.length; i++) {
          utility.callApi(`pages/query`, 'post', {pageId: uniquePages[i].pageId, 'connected': true}, 'accounts', req.headers.authorization)
            .then(page => {
              pageOwnersFound += 1
              if (page[0]) {
                uniquePages[i].connectedBy = page[0].userId
              }
              if (pageOwnersFound === uniquePages.length) {
                utility.callApi(`pages/aggregate`, 'post', countAggregation, 'accounts', req.headers.authorization)
                  .then(count => {
                    return res.status(200).json({
                      status: 'success',
                      payload: {
                        data: uniquePages,
                        totalCount: count[0].count
                      }
                    })
                  })
                  .catch(err => {
                    return res.status(500).json({
                      status: 'failed',
                      description: `Failed to fetch unique pages count ${err}`
                    })
                  })
              }
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `Failed to fetch connected page ${err}`
              })
            })
        }
      } else {
        return res.status(200).json({
          status: 'success',
          payload: {
            data: [],
            totalCount: 0
          }
        })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch unique pages ${err}`, 'debug')
      return res.status(500).json({
        status: 'failed',
        description: `Failed to fetch unique pages ${err}`
      })
    })
}

exports.fetchCompanyInfo = (req, res) => {
  let companyAggregation = [
    {
      '$match': {
        companyName: req.body.companyName ? { $regex: '.*' + req.body.companyName + '.*', $options: 'i' } : {$exists: true}
      }
    },
    {
      '$lookup': {
        from: 'pages',
        localField: '_id',
        foreignField: 'companyId',
        as: 'page'
      }
    },
    {
      '$unwind': '$page'
    },
    { '$lookup': {
      from: 'users',
      localField: 'ownerId',
      foreignField: '_id',
      as: 'user'
    }
    },
    {
      '$unwind': '$user'
    },
    { '$lookup': {
      from: 'companyusers',
      localField: '_id',
      foreignField: 'companyId',
      as: 'companyUser'
    }
    },
    {
      '$unwind': '$companyUser'
    },
    { '$lookup': {
      from: 'subscribers',
      localField: '_id',
      foreignField: 'companyId',
      as: 'subscriber'
    }
    },
    {
      '$unwind': '$subscriber'
    },
    {
      '$group': {
        '_id': '$_id',
        'pages': {'$addToSet': '$page'},
        'companyName': {'$first': '$companyName'},
        'companyUsers': {'$addToSet': '$companyUser'},
        'subscribers': {'$addToSet': '$subscriber'},
        'user': {'$first': '$user'}
      }
    },
    {
      '$sort': {'_id': -1}
    },
    {
      '$project': {
        '_id': 1,
        'companyName': 1,
        'pages': 1,
        'companyUsers': 1,
        'subscribers': 1,
        'user': 1
      }
    },
    {
      '$limit': req.body.pageNumber ? (req.body.pageNumber) * 10 : 10
    }
  ]
  utility.callApi(`companyprofile/aggregate`, 'post', companyAggregation, 'accounts', req.headers.authorization)
    .then(companyOwnedPages => {
      let data = []
      for (let i = 0; i < companyOwnedPages.length; i++) {
        data.push({
          companyName: companyOwnedPages[i].companyName,
          numOfConnectedPages: companyOwnedPages[i].pages.filter(page => page.connected).length,
          numOfOwnedPages: companyOwnedPages[i].pages.length,
          numOfCompanyUsers: companyOwnedPages[i].companyUsers.length,
          numOfSubscribers: companyOwnedPages[i].subscribers.length,
          owner: companyOwnedPages[i].user
        })
      }
      return res.status(200).json({
        status: 'success',
        payload: {
          data
        }
      })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Failed to fetch company owned pages ${err}`
      })
    })
}
exports.topPages = function (req, res) {
  let body = LogicLayer.topPagesCriteria(req.body)
  utility.callApi(`subscribers/aggregate`, 'post', body)
    .then(topPages => {
      sendSuccessResponse(res, 200, topPages)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch sessions ${JSON.stringify(error)}`)
    })
}

exports.fetchCompanyInfoNew = (req, res) => {
  let companyAggregation = [
    {
      '$match': {
        companyName: req.body.companyName ? { $regex: '.*' + req.body.companyName + '.*', $options: 'i' } : {$exists: true}
      }
    },
    {
      '$group': {
        '_id': '$_id',
        'companyName': {'$first': '$companyName'},
        'userId': {'$first': '$ownerId'}
      }
    },
    {
      '$sort': {'_id': -1}
    },
    {
      '$project': {
        '_id': 1,
        'companyName': 1,
        'userId': 1
      }
    },
    {
      '$skip': req.body.pageNumber ? (req.body.pageNumber - 1) * 10 : 0
    },
    {
      '$limit': 10
    }
  ]
  utility.callApi(`companyprofile/aggregate`, 'post', companyAggregation, 'accounts', req.headers.authorization)
    .then(companies => {
      if (companies) {
        let userRequests = []
        let pageRequests = []
        let companyUserRequests = []
        let subscriberRequests = []
        for (let i = 0; i < companies.length; i++) {
          userRequests.push(
            function (callback) {
              utility.callApi(`user/query`, 'post', {_id: companies[i].userId}, 'accounts', req.headers.authorization)
                .then(users => {
                  callback(null, {companyId: companies[i]._id,
                    companyName: companies[i].companyName,
                    user: users.length > 0 ? users[0] : null})
                })
                .catch(err => {
                  callback(err)
                })
            }
          )

          pageRequests.push(
            function (callback) {
              utility.callApi(`pages/query`, 'post', {companyId: companies[i]._id}, 'accounts', req.headers.authorization)
                .then(pages => {
                  callback(null, { numOfOwnedPages: pages.length,
                    numOfConnectedPages: pages.filter(page => page.connected).length})
                })
                .catch(err => {
                  callback(err)
                })
            }
          )

          companyUserRequests.push(
            function (callback) {
              utility.callApi(`companyUser/queryAll`, 'post', {companyId: companies[i]._id}, 'accounts', req.headers.authorization)
                .then(companyUsers => {
                  callback(null, {numOfCompanyUsers: companyUsers.length})
                })
                .catch(err => {
                  callback(err)
                })
            }
          )

          subscriberRequests.push(
            function (callback) {
              utility.callApi(`subscribers/query`, 'post', {companyId: companies[i]._id, completeInfo: true}, 'accounts', req.headers.authorization)
                .then(subscribers => {
                  callback(null, {numOfSubscribers: subscribers.length})
                })
                .catch(err => {
                  callback(err)
                })
            }
          )
        }
        let totalRequests = userRequests.concat(pageRequests).concat(companyUserRequests).concat(subscriberRequests)
        async.parallelLimit(totalRequests, 30, function (err, results) {
          if (err) {
            return res.status(500).json({
              status: 'failed',
              description: `Failed to fetch company data ${err}`
            })
          } else {
            let data = []
            for (let i = 0; i < results.length / 4; i++) {
              data.push({
                owner: results[i].user,
                companyId: results[i].companyId,
                companyName: results[i].companyName,
                numOfOwnedPages: results[i + (results.length / 4)].numOfOwnedPages,
                numOfConnectedPages: results[i + (results.length / 4)].numOfConnectedPages,
                numOfCompanyUsers: results[i + (results.length / 4) * 2].numOfCompanyUsers,
                numOfSubscribers: results[i + (results.length / 4) * 3].numOfSubscribers
              })
            }
            return res.status(200).json({
              status: 'success',
              payload: {
                data
              }
            })
          }
        })
      }
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Failed to fetch companies ${err}`
      })
    })
}

exports.usersListForViewAs = function (req, res) {
  let aggregatePayload = [
    { $project: { domain_email: 1, name: 1, email: 1 } }
  ]
  utility.callApi(`users/aggregate`, 'post', aggregatePayload, 'accounts', req.headers.authorization)
    .then(users => {
      sendSuccessResponse(res, 200, users)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch users list for view as ${JSON.stringify(error)}`)
    })
}
exports.integrationsData = function (req, res) {
  utility.callApi('integrationUsage/query', 'post', {})
    .then(integrationUsages => {
      sendSuccessResponse(res, 200, integrationUsages)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Error in getting unsubscribers ${JSON.stringify(err)}`)
    })
}
exports.pageAnalytics = function (req, res) {
  async.parallelLimit([
    function (callback) {
      let subscriberCriteria = LogicLayer.getPlatformCriteriaForSubscribers(req.body)
      utility.callApi(`subscribers/aggregate`, 'post', subscriberCriteria)
        .then(subscribers => {
          callback(null, subscribers)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let totalPagesCriteria = LogicLayer.getPlatformCriteriaForPages()
      utility.callApi(`pages/aggregate`, 'post', totalPagesCriteria)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let connectedPagesCriteria = LogicLayer.getPlatformCriteriaForPages('connected')
      utility.callApi(`pages/aggregate`, 'post', connectedPagesCriteria)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let messagesCriteria = LogicLayer.getPlatformCriteriaForMessages(req.body)
      utility.callApi(`livechat/query`, 'post', messagesCriteria, 'kibochat')
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      sendErrorResponse(res, 500, '', `Error in getting page analytics ${JSON.stringify(err)}`)
    } else {
      let subscribers = results[0]
      let totalPages = results[1]
      let connectedPages = results[2]
      let messagesSent = results[3]
      let data = {
        totalSubscribers: subscribers[0] ? subscribers[0].count : 0,
        totalPages: totalPages[0] ? totalPages[0].count : 0,
        totalConnectedPages: connectedPages[0] ? connectedPages[0].count : 0,
        totalMessagesSent: messagesSent[0] ? messagesSent[0].count : 0
      }
      sendSuccessResponse(res, 200, data)
    }
  })
}
exports.getAllCommentCaptures = function (req, res) {
  let criteria = LogicLayer.getAllCommentCapturesCriteria(req.body)
  async.parallelLimit([
    function (callback) {
      utility.callApi(`comment_capture/aggregate`, 'post', criteria.countCriteria)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      utility.callApi(`comment_capture/aggregate`, 'post', criteria.finalCriteria)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      sendErrorResponse(res, 500, '', `Error in getting comment captures ${JSON.stringify(err)}`)
    } else {
      let count = results[0]
      let data = {
        commentCaptures: results[1],
        count: count[0] ? count[0].count : 0
      }
      sendSuccessResponse(res, 200, data)
    }
  })
}
exports.getAllChatBots = function (req, res) {
  let criteria = LogicLayer.getAllChatBotsCriteria(req.body)
  async.parallelLimit([
    function (callback) {
      utility.callApi(`chatbots/query`, 'post', criteria.countCriteria, 'kibochat')
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      utility.callApi(`chatbots/query`, 'post', criteria.getCriteria, 'kibochat')
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      sendErrorResponse(res, 500, '', `Error in getting Chat bots ${JSON.stringify(err)}`)
    } else {
      let count = results[0]
      let chatbots = results[1]
      populatePage(chatbots)
        .then(result => {
          let data = {
            chatbots: result,
            count: count[0] ? count[0].count : 0
          }
          sendSuccessResponse(res, 200, data)
        })
        .catch((err) => {
          sendErrorResponse(res, 500, '', `Error in getting Chat bots ${err}`)
        })
    }
  })
}
function populatePage (chatbots) {
  return new Promise(function (resolve, reject) {
    async.each(chatbots, function (chatbot, next) {
      utility.callApi(`pages/query`, 'post', {_id: chatbot.pageId})
        .then(pages => {
          chatbot.pageId = pages[0]
          next()
        })
        .catch(err => {
          next(err)
        })
    }, function (err) {
      if (err) {
        reject(err)
      } else {
        resolve(chatbots)
      }
    })
  })
}
exports.otherAnalytics = function (req, res) {
  let queryForUser = {}
  let queryForOthers = {}
  if (req.body.days !== 'all') {
    let startDate = new Date() // Current date
    startDate.setDate(startDate.getDate() - req.body.days)
    startDate.setHours(0) // Set the hour, minute and second components to 0
    startDate.setMinutes(0)
    startDate.setSeconds(0)
    queryForUser.createdAt = {$gte: startDate}
    queryForOthers.datetime = {$gte: startDate}
  }
  async.parallelLimit([
    function (callback) {
      let query = [
        {$match: queryForUser},
        {$group: { _id: null, count: { $sum: 1 } }}
      ]
      utility.callApi(`user/aggregate`, 'post', query)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      DataLayer.countBroadcasts(queryForOthers)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      DataLayer.countSurveys(queryForOthers)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      DataLayer.countPolls(queryForOthers)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      sendErrorResponse(res, 500, '', `Error in getting page analytics ${JSON.stringify(err)}`)
    } else {
      let totalUsers = results[0]
      let totalBroadcasts = results[1]
      let totalSurveys = results[2]
      let totalPolls = results[3]
      let data = {
        totalUsers: totalUsers[0] ? totalUsers[0].count : 0,
        totalBroadcasts: totalBroadcasts[0] ? totalBroadcasts[0].count : 0,
        totalSurveys: totalSurveys[0] ? totalSurveys[0].count : 0,
        totalPolls: totalPolls[0] ? totalPolls[0].count : 0
      }
      sendSuccessResponse(res, 200, data)
    }
  })
}
