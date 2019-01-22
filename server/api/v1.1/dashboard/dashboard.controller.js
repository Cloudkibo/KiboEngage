const logger = require('../../../components/logger')
// const SessionsDataLayer = require('../sessions/sessions.datalayer')
const LogicLayer = require('./logiclayer')
const BroadcastsDataLayer = require('../broadcasts/broadcasts.datalayer')
const PollsDataLayer = require('../polls/polls.datalayer')
const PollResponsesDataLayer = require('../polls/pollresponse.datalayer')
const SurveysDataLayer = require('../surveys/surveys.datalayer')
const PageBroadcastDataLayer = require('../page_broadcast/page_broadcast.datalayer')
const PageSurveyDataLayer = require('../page_survey/page_survey.datalayer')
const PagePollDataLayer = require('../page_poll/page_poll.datalayer')
const SequenceDataLayer = require('../sequenceMessaging/sequence.datalayer')
const TAG = 'api/pages/dashboard.controller.js'
const mongoose = require('mongoose')
const sortBy = require('sort-array')
const callApi = require('../utility')
const needle = require('needle')

let _ = require('lodash')

exports.index = function (req, res) {
  callApi.callApi('pages/aggregate', 'post', [], req.headers.authorization)
    .then(pages => {
      const data = {}
      let c = pages.length
      data.pagesCount = c
      res.status(200).json(data)
    })
    .catch(err => {
      if (err) {
        return res.status(500)
          .json({status: 'failed', description: JSON.stringify(err)})
      }
    })
}

exports.sentVsSeen = function (req, res) {
  let pageId = req.params.pageId

  callApi.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email}, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      // We should call the count function when we switch to v1.1
      PageBroadcastDataLayer.countDocuments({companyId: companyUser.companyId, pageId: pageId})
        .then(broadcastSentCount => {
          // We should call the count function when we switch to v1.1
          PageBroadcastDataLayer.countDocuments({seen: true, companyId: companyUser.companyId, pagedId: pageId})
            .then(broadcastSeenCount => {
              // call the count function in v1.1
              PageSurveyDataLayer.countDocuments({companyId: companyUser.companyId, pagedId: pageId})
                .then(surveySentCount => {
                  // call the count function in v1.1
                  PageSurveyDataLayer.countDocuments({seen: true, companyId: companyUser.companyId, pageId: pageId})
                    .then(surveySeenCount => {
                      // we should call the v1.1 count function because we are counting here.
                      PagePollDataLayer.countDocuments({companyId: companyUser.companyId, pageId: pageId})
                        .then(pollSentCount => {
                          // we should call the v1.1 count function because we are counting here.
                          PagePollDataLayer.countDocuments({seen: true, companyId: companyUser.companyId, pageId: pageId})
                            .then(pollSeenCount => {
                              SurveysDataLayer.genericFindForSurvey({companyId: companyUser.companyId})
                                .then(surveyResponseCount => {
                                  PollsDataLayer.genericFindForPolls({companyId: companyUser.companyId})
                                    .then(polls => {
                                      PagePollDataLayer.find({companyId: companyUser.companyId})
                                        .then(pollPages => {
                                          // we should call the pollresponse datalayer method in v1.1
                                          let groupPollAggregate = {
                                            _id: '$pollId',
                                            count: {$sum: 1}
                                          }
                                          PollResponsesDataLayer.aggregateForPollResponse({}, groupPollAggregate)
                                            .then(pollResponseCount => {
                                              let responsesCount = []
                                              logger.serverLog(TAG,
                                                `counts for dashboard poll response ${JSON.stringify(
                                                  pollResponseCount)}`)
                                              for (let a = 0; a < polls.length; a++) {
                                                for (let b = 0; b < pollResponseCount.length; b++) {
                                                  if (polls[a]._id.toString() === pollResponseCount[b]._id.toString()) {
                                                    responsesCount.push(pollResponseCount[b].count)
                                                  }
                                                }
                                              }
                                              var sum = 0
                                              if (responsesCount.length > 0) {
                                                for (var c = 0; c <
                                                                    responsesCount.length; c++) {
                                                  sum = sum + responsesCount[c]
                                                }
                                              }
                                              var sum1 = 0
                                              if (surveyResponseCount.length > 0) {
                                                for (var j = 0; j <
                                                                    surveyResponseCount.length; j++) {
                                                  sum1 = sum1 +
                                                                        surveyResponseCount[j].isresponded
                                                }
                                              }

                                              let datacounts = {
                                                broadcast: {
                                                  broadcastSentCount: 0,
                                                  broadcastSeenCount: 0
                                                },
                                                survey: {
                                                  surveySentCount: 0,
                                                  surveySeenCount: 0,
                                                  surveyResponseCount: 0
                                                },
                                                poll: {
                                                  pollSentCount: 0,
                                                  pollSeenCount: 0,
                                                  pollResponseCount: 0
                                                }
                                              }
                                              if (broadcastSentCount.length > 0) {
                                                datacounts.broadcast.broadcastSentCount = broadcastSentCount[0].count
                                                if (broadcastSeenCount.length > 0) {
                                                  datacounts.broadcast.broadcastSeenCount = broadcastSeenCount[0].count
                                                }
                                              }
                                              if (surveySentCount.length > 0) {
                                                datacounts.survey.surveySentCount = surveySentCount[0].count
                                                if (surveySeenCount.length > 0) {
                                                  datacounts.survey.surveySeenCount = surveySeenCount[0].count
                                                  datacounts.survey.surveyResponseCount = sum1
                                                }
                                              }
                                              if (pollSentCount.length > 0) {
                                                datacounts.poll.pollSentCount = pollSentCount[0].count
                                                if (pollSeenCount.length > 0) {
                                                  datacounts.poll.pollSeenCount = pollSeenCount[0].count
                                                  datacounts.poll.pollResponseCount = sum
                                                }
                                              }
                                              res.status(200).json({
                                                status: 'success',
                                                payload: datacounts
                                              })
                                            })
                                            .catch(err => {
                                              if (err) {
                                                return res.status(500).json({
                                                  status: 'failed',
                                                  description: `Error in getting poll response count ${JSON.stringify(
                                                    err)}`
                                                })
                                              }
                                            })
                                        })
                                        .catch(err => {
                                          if (err) {
                                            return res.status(500).json({
                                              status: 'failed',
                                              description: 'Polls not found'
                                            })
                                          }
                                        })
                                    })
                                    .catch(err => {
                                      if (err) {
                                        logger.serverLog(TAG, `Error: ${err}`)
                                        return res.status(500).json({
                                          status: 'failed',
                                          description: `Internal Server Error${JSON.stringify(
                                            err)}`
                                        })
                                      }
                                    })
                                })
                                .catch(err => {
                                  if (err) {
                                    return res.status(500).json({
                                      status: 'failed',
                                      description: 'responses count not found'
                                    })
                                  }
                                })
                            })
                            .catch(err => {
                              if (err) {
                                return res.status(500).json({
                                  status: 'failed',
                                  description: `Error in getting pollSeenCount count ${JSON.stringify(
                                    err)}`
                                })
                              }
                            })
                        })
                        .catch(err => {
                          if (err) {
                            return res.status(500).json({
                              status: 'failed',
                              description: `Error in getting pollSentCount count ${JSON.stringify(
                                err)}`
                            })
                          }
                        })
                    })
                    .catch(err => {
                      if (err) {
                        return res.status(500).json({
                          status: 'failed',
                          description: `Error in getting surveytSeenCount count ${JSON.stringify(
                            err)}`
                        })
                      }
                    })
                })
                .catch(err => {
                  if (err) {
                    return res.status(500).json({
                      status: 'failed',
                      description: `Error in getting surveySentCount count ${JSON.stringify(
                        err)}`
                    })
                  }
                })
            })
            .catch(err => {
              if (err) {
                return res.status(500).json({
                  status: 'failed',
                  description: `Error in getting broadcastSeenCount count ${JSON.stringify(
                    err)}`
                })
              }
            })
        })
        .catch(err => {
          if (err) {
            return res.status(500).json({
              status: 'failed',
              description: `Error in getting broadcastSentCount count ${JSON.stringify(
                err)}`
            })
          }
        })
    })
    .catch(err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
    })
}

exports.sentVsSeenNew = function (req, res) {
  console.log('req.body in sentVsSeenNew', req.body)
  callApi.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email}, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      // We should call the count function when we switch to v1.1
      PageBroadcastDataLayer.countDocuments(LogicLayer.getCriterias(req.body, companyUser))
        .then(broadcastSentCount => {
          console.log('broadcastSentCount', broadcastSentCount)
          // We should call the count function when we switch to v1.1
          PageBroadcastDataLayer.countDocuments(LogicLayer.getCriterias(req.body, companyUser, true))
            .then(broadcastSeenCount => {
              console.log('broadcastSeenCount', broadcastSeenCount)
              // call the count function in v1.1
              PageSurveyDataLayer.countDocuments(LogicLayer.getCriterias(req.body, companyUser))
                .then(surveySentCount => {
                  // call the count function in v1.1
                  PageSurveyDataLayer.countDocuments(LogicLayer.getCriterias(req.body, companyUser, true))
                    .then(surveySeenCount => {
                      // we should call the v1.1 count function because we are counting here.
                      PagePollDataLayer.countDocuments(LogicLayer.getCriterias(req.body, companyUser))
                        .then(pollSentCount => {
                          // we should call the v1.1 count function because we are counting here.
                          PagePollDataLayer.countDocuments(LogicLayer.getCriterias(req.body, companyUser, true))
                            .then(pollSeenCount => {
                              console.log('pollSeenCount', pollSeenCount)
                              SurveysDataLayer.genericFindForSurvey({companyId: companyUser.companyId})
                                .then(surveyResponseCount => {
                                  PollsDataLayer.genericFindForPolls({companyId: companyUser.companyId})
                                    .then(polls => {
                                      PagePollDataLayer.find({companyId: companyUser.companyId})
                                        .then(pollPages => {
                                          // we should call the pollresponse datalayer method in v1.1
                                          let groupPollAggregate = {
                                            _id: '$pollId',
                                            count: {$sum: 1}
                                          }
                                          PollResponsesDataLayer.aggregateForPollResponse({}, groupPollAggregate)
                                            .then(pollResponseCount => {
                                              let responsesCount = []
                                              logger.serverLog(TAG,
                                                `counts for dashboard poll response ${JSON.stringify(
                                                  pollResponseCount)}`)
                                              for (let a = 0; a < polls.length; a++) {
                                                for (let b = 0; b < pollResponseCount.length; b++) {
                                                  if (polls[a]._id.toString() === pollResponseCount[b]._id.toString()) {
                                                    responsesCount.push(pollResponseCount[b].count)
                                                  }
                                                }
                                              }
                                              var sum = 0
                                              if (responsesCount.length > 0) {
                                                for (var c = 0; c <
                                                                    responsesCount.length; c++) {
                                                  sum = sum + responsesCount[c]
                                                }
                                              }
                                              var sum1 = 0
                                              if (surveyResponseCount.length > 0) {
                                                for (var j = 0; j <
                                                                    surveyResponseCount.length; j++) {
                                                  sum1 = sum1 +
                                                                        surveyResponseCount[j].isresponded
                                                }
                                              }

                                              let datacounts = {
                                                broadcast: {
                                                  broadcastSentCount: 0,
                                                  broadcastSeenCount: 0
                                                },
                                                survey: {
                                                  surveySentCount: 0,
                                                  surveySeenCount: 0,
                                                  surveyResponseCount: 0
                                                },
                                                poll: {
                                                  pollSentCount: 0,
                                                  pollSeenCount: 0,
                                                  pollResponseCount: 0
                                                }
                                              }
                                              if (broadcastSentCount.length > 0) {
                                                datacounts.broadcast.broadcastSentCount = broadcastSentCount[0].count
                                                if (broadcastSeenCount.length > 0) {
                                                  datacounts.broadcast.broadcastSeenCount = broadcastSeenCount[0].count
                                                }
                                              }
                                              if (surveySentCount.length > 0) {
                                                datacounts.survey.surveySentCount = surveySentCount[0].count
                                                if (surveySeenCount.length > 0) {
                                                  datacounts.survey.surveySeenCount = surveySeenCount[0].count
                                                  datacounts.survey.surveyResponseCount = sum1
                                                }
                                              }
                                              if (pollSentCount.length > 0) {
                                                datacounts.poll.pollSentCount = pollSentCount[0].count
                                                if (pollSeenCount.length > 0) {
                                                  datacounts.poll.pollSeenCount = pollSeenCount[0].count
                                                  datacounts.poll.pollResponseCount = sum
                                                }
                                              }
                                              logger.serverLog(TAG, `datacounts ${JSON.stringify(datacounts)}`)
                                              graphDataNew(req.body, companyUser)
                                                .then(result => {
                                                  return res.status(200).json({
                                                    status: 'success',
                                                    payload: {
                                                      datacounts,
                                                      graphDatas: result
                                                    }
                                                  })
                                                })
                                                .catch(err => {
                                                  return res.status(500).json({
                                                    status: 'failed',
                                                    description: `Error in getting graphdaya ${JSON.stringify(
                                                      err)}`
                                                  })
                                                })
                                            })
                                            .catch(err => {
                                              if (err) {
                                                return res.status(500).json({
                                                  status: 'failed',
                                                  description: `Error in getting poll response count ${JSON.stringify(
                                                    err)}`
                                                })
                                              }
                                            })
                                        })
                                        .catch(err => {
                                          if (err) {
                                            logger.serverLog(TAG, `Error: ${err}`)
                                            return res.status(500).json({
                                              status: 'failed',
                                              description: `Internal Server Error${JSON.stringify(
                                                err)}`
                                            })
                                          }
                                        })
                                    })
                                    .catch(err => {
                                      if (err) {
                                        logger.serverLog(TAG, `Error: ${err}`)
                                        return res.status(500).json({
                                          status: 'failed',
                                          description: `Internal Server Error${JSON.stringify(
                                            err)}`
                                        })
                                      }
                                    })
                                })
                                .catch(err => {
                                  if (err) {
                                    return res.status(500).json({
                                      status: 'failed',
                                      description: 'responses count not found'
                                    })
                                  }
                                })
                            })
                            .catch(err => {
                              if (err) {
                                return res.status(500).json({
                                  status: 'failed',
                                  description: `Error in getting pollSeenCount count ${JSON.stringify(
                                    err)}`
                                })
                              }
                            })
                        })
                        .catch(err => {
                          if (err) {
                            return res.status(500).json({
                              status: 'failed',
                              description: `Error in getting pollSentCount count ${JSON.stringify(
                                err)}`
                            })
                          }
                        })
                    })
                    .catch(err => {
                      if (err) {
                        return res.status(500).json({
                          status: 'failed',
                          description: `Error in getting surveytSeenCount count ${JSON.stringify(
                            err)}`
                        })
                      }
                    })
                })
                .catch(err => {
                  if (err) {
                    return res.status(500).json({
                      status: 'failed',
                      description: `Error in getting surveySentCount count ${JSON.stringify(
                        err)}`
                    })
                  }
                })
            })
            .catch(err => {
              if (err) {
                return res.status(500).json({
                  status: 'failed',
                  description: `Error in getting broadcastSeenCount count ${JSON.stringify(
                    err)}`
                })
              }
            })
        })
        .catch(err => {
          if (err) {
            return res.status(500).json({
              status: 'failed',
              description: `Error in getting broadcastSentCount count ${JSON.stringify(
                err)}`
            })
          }
        })
    })
    .catch(err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
    })
}

exports.likesVsSubscribers = function (req, res) {
  callApi.callApi('pages/query', 'post', {userId: req.params.userid, connected: true}, req.headers.authorization)
    .then(pages => {
      callApi.callApi('subscribers/aggregate', 'post', [
        {
          $match: {
            userId: mongoose.Types.ObjectId(req.params.userid)
          }
        }, {
          $group: {
            _id: {pageId: '$pageId'},
            count: {$sum: 1}
          }
        }], req.headers.authorization)
        .then(gotSubscribersCount => {
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
              subscribers: 0
            })
          }
          for (let i = 0; i < pagesPayload.length; i++) {
            for (let j = 0; j < gotSubscribersCount.length; j++) {
              if (pagesPayload[i]._id.toString() ===
                            gotSubscribersCount[j]._id.pageId.toString()) {
                pagesPayload[i].subscribers = gotSubscribersCount[j].count
              }
            }
          }
          res.status(200).json({
            status: 'success',
            payload: pagesPayload
          })
        })
        .catch(err => {
          if (err) {
            return res.status(404).json({
              status: 'failed',
              description: `Error in getting pages subscriber count ${JSON.stringify(
                err)}`
            })
          }
        })
    })
    .catch(err => {
      if (err) {
        return res.status(404).json({
          status: 'failed',
          description: `Error in getting pages ${JSON.stringify(err)}`
        })
      }
    })
}

exports.enable = function (req, res) {

}

// exports.disable = function (req, res) {
//   const updateData = {
//     connected: false
//   }
//   Pages.update({_id: req.body._id}, updateData, (err, affected) => {
//   })
// }

exports.otherPages = function (req, res) {
  callApi.callApi('pages/query', 'post', {connected: false}, req.headers.authorization)
    .then(pages => {
      res.status(200).json(pages)
    })
    .catch(err => {
      logger.serverLog(TAG, `Error: ${err}`)
    })
}

exports.stats = function (req, res) {
  const payload = {
    scheduledBroadcast: 0,
    username: req.user.name
  }

  callApi.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email}, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      callApi.callApi('pages/query', 'post', {connected: true, companyId: companyUser.companyId}, req.headers.authorization)
        .then((pages) => {
          payload.pages = pages.length
          callApi.callApi('pages/query', 'post', {companyId: companyUser.companyId}, req.headers.authorization)
            .then(allPages => {
              let removeDuplicates = (myArr, prop) => {
                return myArr.filter((obj, pos, arr) => {
                  return arr.map(mapObj => mapObj[prop]).indexOf(obj[prop]) === pos
                })
              }
              let allPagesWithoutDuplicates = removeDuplicates(allPages, 'pageId')
              payload.totalPages = allPagesWithoutDuplicates.length
              callApi.callApi('subscribers/query', 'post', {companyId: companyUser.companyId, isEnabledByPage: true, isSubscribed: true}, req.headers.authorization)
                .then(subscribers => {
                  logger.serverLog(TAG, `subscribers retrieved: ${subscribers}`)
                  payload.subscribers = subscribers.length
                  BroadcastsDataLayer.findBroadcastsWithSortLimit({companyId: companyUser.companyId}, {'datetime': 1}, 10)
                    .then(recentBroadcasts => {
                      payload.recentBroadcasts = recentBroadcasts
                      BroadcastsDataLayer.countBroadcasts({companyId: companyUser.companyId})
                        .then(broadcastCount => {
                          PollsDataLayer.countPolls({companyId: companyUser.companyId})
                            .then(pollsCount => {
                              SurveysDataLayer.countSurveys({companyId: companyUser.companyId})
                                .then(surveysCount => {
                                  payload.activityChart = {
                                    messages: broadcastCount,
                                    polls: pollsCount,
                                    surveys: surveysCount
                                  }
                                  SequenceDataLayer.countSequences({companyId: companyUser.companyId})
                                    .then(sequences => {
                                      payload.sequences = sequences.length
                                      res.status(200).json({
                                        status: 'success',
                                        payload
                                      })
                                    })
                                    .catch(err => {
                                      return res.status(500).json({
                                        status: 'failed',
                                        description: `failed to retrieve sequences ${err}`
                                      })
                                    })
                                })
                                .catch(err => {
                                  if (err) {
                                    return res.status(500).json({
                                      status: 'failed to retrieve surveysCount',
                                      description: JSON.stringify(err)
                                    })
                                  }
                                })
                            })
                            .catch(err => {
                              if (err) {
                                return res.status(500).json({
                                  status: 'failed to retrieve pollsCount',
                                  description: JSON.stringify(err)
                                })
                              }
                            })
                        })
                        .catch(err => {
                          if (err) {
                            return res.status(500).json({
                              status: 'failed to retrieve broadcastCount',
                              description: JSON.stringify(err)
                            })
                          }
                        })
                    })
                    .catch(err => {
                      if (err) {
                        return res.status(500).json({
                          status: 'failed to retrieve recentBroadcast',
                          description: JSON.stringify(err)
                        })
                      }
                    })
                })
                .catch(err => {
                  if (err) {
                    return res.status(500).json(
                      {status: `failed to retrieve subscribers ${err}`, description: err})
                  }
                })
            })
            .catch(err => {
              if (err) {
                return res.status(500)
                  .json({status: 'failed to retrieve userPages', description: err})
              }
            })
        })
        .catch(err => {
          if (err) {
            return res.status(500)
              .json({status: 'failed to retrieve pages', description: err})
          }
        })
    })
    .catch(err => {
      if (err) {
        return res.status(500).json({
          status: 'failed to retrieve companyUser',
          description: `Internal Server Error ${err}`
        })
      }
    })
}
exports.graphData = function (req, res) {
  var days = 0
  if (req.params.days === '0') {
    days = 10
  } else {
    days = req.params.days
  }

  callApi.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email}, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      // We need to use aggregate of v1.1
      let matchBroadcastAggregate = { companyId: companyUser.companyId.toString(),
        'datetime': {
          $gte: new Date(
            (new Date().getTime() - (days * 24 * 60 * 60 * 1000))),
          $lt: new Date(
            (new Date().getTime()))
        }
      }
      let groupBroadcastAggregate = {
        _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
        count: {$sum: 1}}

      BroadcastsDataLayer.aggregateForBroadcasts(matchBroadcastAggregate, groupBroadcastAggregate)
        .then(broadcastsgraphdata => {
          console.log('broadcastsgraphdata', broadcastsgraphdata)
          // We should call the aggregate of polls layer
          let matchPollAggregate = { companyId: companyUser.companyId.toString(),
            'datetime': {
              $gte: new Date(
                (new Date().getTime() - (days * 24 * 60 * 60 * 1000))),
              $lt: new Date(
                (new Date().getTime()))
            }
          }
          let groupPollAggregate = {
            _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
            count: {$sum: 1}}
          PollsDataLayer.aggregateForPolls(matchPollAggregate, groupPollAggregate)
            .then(pollsgraphdata => {
              console.log('pollsgraphdata', pollsgraphdata)
              let matchSurveyAggregate = { companyId: companyUser.companyId.toString(),
                'datetime': {
                  $gte: new Date(
                    (new Date().getTime() - (days * 24 * 60 * 60 * 1000))),
                  $lt: new Date(
                    (new Date().getTime()))
                }
              }
              let groupSurveyAggregate = {
                _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
                count: {$sum: 1}}
              SurveysDataLayer.aggregateForSurveys(matchSurveyAggregate, groupSurveyAggregate)
                .then(surveysgraphdata => {
                  console.log('surveysgraphdata', surveysgraphdata)
                  return res.status(200)
                    .json({status: 'success', payload: {broadcastsgraphdata: broadcastsgraphdata, pollsgraphdata: pollsgraphdata, surveysgraphdata: surveysgraphdata}})
                })
                .catch(err => {
                  if (err) {
                    return res.status(500).json({
                      status: 'failed',
                      description: `Error in getting surveys count ${JSON.stringify(err)}`
                    })
                  }
                })
                .catch(err => {
                  if (err) {
                    return res.status(500).json({
                      status: 'failed',
                      description: `Error in getting surveys count ${JSON.stringify(err)}`
                    })
                  }
                })
            })
            .catch(err => {
              if (err) {
                return res.status(500).json({
                  status: 'failed',
                  description: `Error in getting surveys count ${JSON.stringify(err)}`
                })
              }
            })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Error in getting surveys count ${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
    })
}
function graphDataNew (body, companyUser) {
  return new Promise(function (resolve, reject) {
    logger.serverLog(TAG, `graphDataNew`, body.days)
    let groupAggregate = {
      _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
      count: {$sum: 1}}
    let matchBroadcastAggregate = { companyId: companyUser.companyId.toString(),
      'datetime': {
        $gte: new Date(
          (new Date().getTime() - (body.days * 24 * 60 * 60 * 1000))),
        $lt: new Date(
          (new Date().getTime()))
      }
    }
    let groupBroadcastAggregate = {
      _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
      count: {$sum: 1}}
    logger.serverLog(TAG, `aggregateForBroadcasts`, JSON.stringify(matchBroadcastAggregate))
    BroadcastsDataLayer.aggregateForBroadcasts(matchBroadcastAggregate, groupBroadcastAggregate)
      .then(broadcastsgraphdata => {
        logger.serverLog(TAG, `broadcastsgraphdata ${broadcastsgraphdata}`)
        console.log('broadcastsgraphdata', broadcastsgraphdata)
        logger.serverLog(TAG, `aggregateForPolls`, JSON.stringify(LogicLayer.getCriterias(body, companyUser)))
        PagePollDataLayer.aggregateForPolls(LogicLayer.getCriterias(body, companyUser), groupAggregate)
          .then(pollsgraphdata => {
            console.log('pollsgraphdata', pollsgraphdata)
            PageSurveyDataLayer.aggregateForSurveys(LogicLayer.getCriterias(body, companyUser), groupAggregate)
              .then(surveysgraphdata => {
                console.log('surveysgraphdata', surveysgraphdata)
                resolve({
                  broadcastsgraphdata: broadcastsgraphdata,
                  pollsgraphdata: pollsgraphdata,
                  surveysgraphdata: surveysgraphdata
                })
              })
              .catch(err => {
                reject(err)
              })
          })
          .catch(err => {
            reject(err)
          })
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.toppages = function (req, res) {
  callApi.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email}, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      callApi.callApi('pages/query', 'post', {connected: true, companyId: companyUser.companyId})
        .then(pages => {
          callApi.callApi('subscribers/aggregate', 'post', [
            {$match: {companyId: companyUser.companyId}}, {
              $group: {
                _id: {pageId: '$pageId'},
                count: {$sum: 1}
              }
            }], req.headers.authorization)
            .then(gotSubscribersCount => {
              logger.serverLog(TAG, `pages: ${pages}`)
              logger.serverLog(TAG, `gotSubscribersCount ${gotSubscribersCount}`)
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
                  subscribers: 0
                })
              }
              logger.serverLog(TAG, `pagesPayload: ${pagesPayload}`)
              for (let i = 0; i < pagesPayload.length; i++) {
                for (let j = 0; j < gotSubscribersCount.length; j++) {
                  if (pagesPayload[i]._id.toString() ===
                          gotSubscribersCount[j]._id.pageId.toString()) {
                    pagesPayload[i].subscribers = gotSubscribersCount[j].count
                  }
                }
              }
              let sorted = sortBy(pagesPayload, 'subscribers')
              let top10 = _.takeRight(sorted, 10)
              top10 = top10.reverse()
              res.status(200).json({
                status: 'success',
                payload: top10
              })
            })
            .catch(err => {
              if (err) {
                return res.status(404).json({
                  status: 'failed',
                  description: `Error in getting pages subscriber count ${err}`
                })
              }
            })
        })
        .catch(err => {
          if (err) {
            return res.status(404).json({
              status: 'failed',
              description: `Error in getting pages ${err}`
            })
          }
        })
    })
    .catch(err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
    })
}

exports.getAllSubscribers = function (req, res) {
  let search = new RegExp('.*' + req.body.filter_criteria.search_value + '.*', 'i')
  let findCriteria = {
    pageId: mongoose.Types.ObjectId(req.params.pageid),
    $or: [{firstName: {$regex: search}}, {lastName: {$regex: search}}],
    gender: req.body.filter_criteria.gender_value !== '' ? req.body.filter_criteria.gender_value : {$exists: true},
    locale: req.body.filter_criteria.locale_value !== '' ? req.body.filter_criteria.locale_value : {$exists: true},
    $limit: req.body.number_of_records
  }
  if (req.body.first_page === 'first') {
    callApi.callApi('subscribers/aggregate', 'post', [
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ], req.headers.authorization)
      .then(subscribersCount => {
        callApi.callApi('subscribers/query', 'post', findCriteria, req.headers.authorization)
          .then(subscribers => {
            res.status(200).json({
              status: 'success',
              payload: {subscribers: subscribers, count: subscribers.length > 0 ? subscribersCount[0].count : ''}
            })
          })
          .catch(err => {
            if (err) {
              return res.status(404).json({
                status: 'failed',
                description: `Error in getting subscribers ${JSON.stringify(err)}`
              })
            }
          })
      })
      .catch(err => {
        if (err) {
          return res.status(404)
            .json({status: 'failed', description: 'Subscribers not found'})
        }
      })
  } else if (req.body.first_page === 'next') {
    callApi.callApi('subscribers/aggregate', 'post', [
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ], req.headers.authorization)
      .then(subscribersCount => {
        callApi.callApi('subscribers/query', 'post', Object.assign(findCriteria, {_id: {$gt: req.body.last_id}}, req.headers.authorization))
          .then(subscribers => {
            res.status(200).json({
              status: 'success',
              payload: {subscribers: subscribers, count: subscribers.length > 0 ? subscribersCount[0].count : ''}
            })
          })
          .catch(err => {
            if (err) {
              return res.status(404).json({
                status: 'failed',
                description: `Error in getting subscribers ${JSON.stringify(err)}`
              })
            }
          })
      })
      .catch(err => {
        if (err) {
          return res.status(404)
            .json({status: 'failed', description: 'BroadcastsCount not found'})
        }
      })
  } else if (req.body.first_page === 'previous') {
    callApi.callApi('subscribers/query', 'post', [
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ], req.headers.authorization)
      .then(subscribersCount => {
        callApi.callApi('subscribers/query', Object.assign(findCriteria, {_id: {$lt: req.body.last_id}}, req.headers.authorization))
          .then(subscribers => {
            res.status(200).json({
              status: 'success',
              payload: {subscribers: subscribers, count: subscribers.length > 0 ? subscribersCount[0].count : ''}
            })
          })
          .catch(err => {
            if (err) {
              return res.status(404).json({
                status: 'failed',
                description: `Error in getting subscribers ${JSON.stringify(err)}`
              })
            }
          })
      })
      .catch(err => {
        if (err) {
          return res.status(404)
            .json({status: 'failed', description: 'BroadcastsCount not found'})
        }
      })
  }
}
exports.updateSubscriptionPermission = function (req, res) {
  callApi.callApi('pages/query', 'post', {userId: req.user._id})
    .then(userPages => {
      userPages.forEach((page) => {
        needle.get(
          `https://graph.facebook.com/v2.10/${page.pageId}?fields=access_token&access_token=${req.user.facebookInfo.fbToken}`,
          (err, resp) => {
            if (err) {
              logger.serverLog(TAG,
                `Page access token from graph api error ${JSON.stringify(
                  err)}`)
            }
            if (resp && resp.body && resp.body.access_token) {
              needle.get(
                `https://graph.facebook.com/v2.11/me/messaging_feature_review?access_token=${resp.body.access_token}`,
                (err, respp) => {
                  if (err) {
                    logger.serverLog(TAG,
                      `Page access token from graph api error ${JSON.stringify(
                        err)}`)
                  }
                  console.log('response from subscription_messaging', respp.body)
                  if (respp.body && respp.body.data && respp.body.data.length > 0) {
                    for (let a = 0; a < respp.body.data.length; a++) {
                      if (respp.body.data[a].feature === 'subscription_messaging' && respp.body.data[a].status === 'approved') {
                        console.log('inside if')
                        callApi.callApi(`pages/${page._id}`, 'put', {gotPageSubscriptionPermission: true}, req.headers.authorization) // disconnect page
                          .then(updated => {
                            console.log('updated', updated)
                          })
                          .catch(err => {
                            console.log('failed to update page', err)
                          })
                      }
                    }
                  }
                })
            }
          })
      })
      return res.status(200).json({
        status: 'success'
      })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed to retrieve connected Pages',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    })
}
exports.subscriberSummary = function (req, res) {
  callApi.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email}, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      callApi.callApi('subscribers/aggregate', 'post', LogicLayer.queryForSubscribers(req.body, companyUser, true), req.headers.authorization)
        .then(subscribers => {
          callApi.callApi('subscribers/aggregate', 'post', LogicLayer.queryForSubscribers(req.body, companyUser, false), req.headers.authorization)
            .then(unsubscribes => {
              callApi.callApi('subscribers/aggregate', 'post', LogicLayer.queryForSubscribersGraph(req.body, companyUser, true), req.headers.authorization)
                .then(graphdata => {
                  let data = {
                    subscribes: subscribers[0].count,
                    unsubscribes: unsubscribes[0].count,
                    graphdata: graphdata
                  }
                  return res.status(200).json({
                    status: 'success',
                    payload: data
                  })
                })
                .catch(err => {
                  return res.status(500).json({
                    status: 'failed',
                    description: `Error in getting graphdata ${JSON.stringify(err)}`
                  })
                })
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `Error in getting unsubscribers ${JSON.stringify(err)}`
              })
            })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Error in getting subscribers ${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    })
}
