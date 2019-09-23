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
const AutopostingMessagesDataLayer = require('../autopostingMessages/autopostingMessages.datalayer')
const AutopostingDataLayer = require('../autoposting/autoposting.datalayer')
const TAG = 'api/pages/dashboard.controller.js'
const sortBy = require('sort-array')
const callApi = require('../utility')
const needle = require('needle')
const async = require('async')
let _ = require('lodash')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
let { sendOpAlert } = require('./../../global/operationalAlert')

exports.index = function (req, res) {
  callApi.callApi('pages/aggregate', 'post', [])
    .then(pages => {
      const data = {}
      let c = pages.length
      data.pagesCount = c
      sendSuccessResponse(res, 200, data)
    })
    .catch(err => {
      if (err) {
        sendErrorResponse(res, 500, '', JSON.stringify(err))
      }
    })
}

exports.sentVsSeen = function (req, res) {
  let pageId = req.params.pageId

  callApi.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
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
                                              // logger.serverLog(TAG,
                                              //   `counts for dashboard poll response ${JSON.stringify(
                                              //     pollResponseCount)}`, 'debug')
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
                                              sendSuccessResponse(res, 200, datacounts)
                                            })
                                            .catch(err => {
                                              if (err) {
                                                sendErrorResponse(res, 500, '', `Error in getting poll response count ${JSON.stringify(err)}`)
                                              }
                                            })
                                        })
                                        .catch(err => {
                                          if (err) {
                                            sendErrorResponse(res, 500, '', 'Polls not found')
                                          }
                                        })
                                    })
                                    .catch(err => {
                                      if (err) {
                                        logger.serverLog(TAG, `Error: ${err}`, 'error')
                                        sendErrorResponse(res, 500, '', `Internal Server Error${JSON.stringify(err)}`)
                                      }
                                    })
                                })
                                .catch(err => {
                                  if (err) {
                                    sendErrorResponse(res, 500, '', 'responses count not found')
                                  }
                                })
                            })
                            .catch(err => {
                              if (err) {
                                sendErrorResponse(res, 500, '', `Error in getting pollSeenCount count ${JSON.stringify(err)}`)
                              }
                            })
                        })
                        .catch(err => {
                          if (err) {
                            sendErrorResponse(res, 500, '', `Error in getting pollSentCount count ${JSON.stringify(err)}`)
                          }
                        })
                    })
                    .catch(err => {
                      if (err) {
                        sendErrorResponse(res, 500, '', `Error in getting surveytSeenCount count ${JSON.stringify(err)}`)
                      }
                    })
                })
                .catch(err => {
                  if (err) {
                    sendErrorResponse(res, 500, '', `Error in getting surveySentCount count ${JSON.stringify(err)}`)
                  }
                })
            })
            .catch(err => {
              if (err) {
                sendErrorResponse(res, 500, '', `Error in getting broadcastSeenCount count ${JSON.stringify(err)}`)
              }
            })
        })
        .catch(err => {
          if (err) {
            sendErrorResponse(res, 500, '', `Error in getting broadcastSentCount count ${JSON.stringify(err)}`)
          }
        })
    })
    .catch(err => {
      if (err) {
        sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
      }
    })
}

function populateIds (pages, subscriber) {
  return new Promise(function (resolve, reject) {
    let pageIds = []
    for (let i = 0; i < pages.length; i++) {
      if (subscriber) {
        pageIds.push(pages[i]._id)
      } else {
        pageIds.push(pages[i].pageId)
      }
      if (pageIds.length === pages.length) {
        resolve({pageIds: pageIds})
      }
    }
  })
}

exports.sentVsSeenNew = function (req, res) {
  callApi.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      callApi.callApi(`pages/query`, 'post', {connected: true, companyId: companyUser.companyId}) // fetch connected pages
        .then(pages => {
          populateIds(pages).then(result => {
          // We should call the count function when we switch to v1.1
            PageBroadcastDataLayer.countDocuments(LogicLayer.getCriterias(req.body, companyUser, false, result.pageIds))
              .then(broadcastSentCount => {
                // We should call the count function when we switch to v1.1
                PageBroadcastDataLayer.countDocuments(LogicLayer.getCriterias(req.body, companyUser, true, result.pageIds))
                  .then(broadcastSeenCount => {
                    // call the count function in v1.1
                    PageSurveyDataLayer.countDocuments(LogicLayer.getCriterias(req.body, companyUser, false, result.pageIds))
                      .then(surveySentCount => {
                        // call the count function in v1.1
                        PageSurveyDataLayer.countDocuments(LogicLayer.getCriterias(req.body, companyUser, true, result.pageIds))
                          .then(surveySeenCount => {
                            // we should call the v1.1 count function because we are counting here.
                            PagePollDataLayer.countDocuments(LogicLayer.getCriterias(req.body, companyUser, false, result.pageIds))
                              .then(pollSentCount => {
                                // we should call the v1.1 count function because we are counting here.
                                PagePollDataLayer.countDocuments(LogicLayer.getCriterias(req.body, companyUser, true, result.pageIds))
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
                                                    // logger.serverLog(TAG,
                                                    //   `counts for dashboard poll response ${JSON.stringify(
                                                    //     pollResponseCount)}`, 'debug')
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
                                                    // logger.serverLog(TAG, `datacounts ${JSON.stringify(datacounts)}`, 'debug')
                                                    graphDataNew(req.body, companyUser, result.pageIds)
                                                      .then(result => {
                                                        sendSuccessResponse(res, 200, {datacounts, graphDatas: result})
                                                      })
                                                      .catch(err => {
                                                        sendErrorResponse(res, 500, '', `Error in getting graphdaya ${JSON.stringify(err)}`)
                                                      })
                                                  })
                                                  .catch(err => {
                                                    if (err) {
                                                      sendErrorResponse(res, 500, '', `Error in getting poll response count ${JSON.stringify(err)}`)
                                                    }
                                                  })
                                              })
                                              .catch(err => {
                                                if (err) {
                                                  logger.serverLog(TAG, `Error: ${err}`, 'error')
                                                  sendErrorResponse(res, 500, '', `Internal Server Error${JSON.stringify(err)}`)
                                                }
                                              })
                                          })
                                          .catch(err => {
                                            if (err) {
                                              logger.serverLog(TAG, `Error: ${err}`, 'error')
                                              sendErrorResponse(res, 500, '', `Internal Server Error${JSON.stringify(err)}`)
                                            }
                                          })
                                      })
                                      .catch(err => {
                                        if (err) {
                                          sendErrorResponse(res, 500, '', 'responses count not found')
                                        }
                                      })
                                  })
                                  .catch(err => {
                                    if (err) {
                                      sendErrorResponse(res, 500, '', `Error in getting pollSeenCount count ${JSON.stringify(err)}`)
                                    }
                                  })
                              })
                              .catch(err => {
                                if (err) {
                                  sendErrorResponse(res, 500, '', `Error in getting pollSentCount count ${JSON.stringify(err)}`)
                                }
                              })
                          })
                          .catch(err => {
                            if (err) {
                              sendErrorResponse(res, 500, '', `Error in getting surveytSeenCount count ${JSON.stringify(err)}`)
                            }
                          })
                      })
                      .catch(err => {
                        if (err) {
                          sendErrorResponse(res, 500, '', `Error in getting surveySentCount count ${JSON.stringify(err)}`)
                        }
                      })
                  })
                  .catch(err => {
                    if (err) {
                      sendErrorResponse(res, 500, '', `Error in getting broadcastSeenCount count ${JSON.stringify(err)}`)
                    }
                  })
              })
              .catch(err => {
                if (err) {
                  sendErrorResponse(res, 500, '', `Error in getting broadcastSentCount count ${JSON.stringify(err)}`)
                }
              })
          })
        })
        .catch(err => {
          if (err) {
            sendErrorResponse(res, 500, '', `Error in getting connected pages ${JSON.stringify(err)}`)
          }
        })
    })
    .catch(err => {
      if (err) {
        sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
      }
    })
}

exports.likesVsSubscribers = function (req, res) {
  callApi.callApi('pages/query', 'post', {companyId: req.user.companyId, connected: true})
    .then(pages => {
      callApi.callApi('subscribers/aggregate', 'post', [
        {
          $match: {
            userId: req.params.userid
          }
        }, {
          $group: {
            _id: {pageId: '$pageId'},
            count: {$sum: 1}
          }
        }])
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
          sendSuccessResponse(res, 200, pagesPayload)
        })
        .catch(err => {
          if (err) {
            sendErrorResponse(res, 500, '', `Error in getting pages subscriber count ${JSON.stringify(err)}`)
          }
        })
    })
    .catch(err => {
      if (err) {
        sendErrorResponse(res, 500, '', `Error in getting pages ${JSON.stringify(err)}`)
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
  callApi.callApi('pages/query', 'post', {companyId: req.user.companyId, connected: false})
    .then(pages => {
      sendSuccessResponse(res, 200, pages)
    })
    .catch(err => {
      logger.serverLog(TAG, `Error: ${err}`, 'error')
    })
}

exports.stats = function (req, res) {
  const payload = {
    scheduledBroadcast: 0,
    username: req.user.name
  }

  callApi.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      callApi.callApi('pages/query', 'post', {connected: true, companyId: companyUser.companyId})
        .then((pages) => {
          populateIds(pages, true).then(result => {
            payload.pages = pages.length
            callApi.callApi('pages/query', 'post', {companyId: companyUser.companyId})
              .then(allPages => {
                let removeDuplicates = (myArr, prop) => {
                  return myArr.filter((obj, pos, arr) => {
                    return arr.map(mapObj => mapObj[prop]).indexOf(obj[prop]) === pos
                  })
                }
                let allPagesWithoutDuplicates = removeDuplicates(allPages, 'pageId')
                payload.totalPages = allPagesWithoutDuplicates.length
                callApi.callApi('subscribers/query', 'post', {companyId: companyUser.companyId, isSubscribed: true, pageId: {$in: result.pageIds}})
                  .then(subscribers => {
                    //logger.serverLog(TAG, `subscribers retrieved: ${subscribers}`, 'debug')
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
                                        payload.sequences = sequences.length > 0 ? sequences[0].count : 0
                                        sendSuccessResponse(res, 200, payload)
                                      })
                                      .catch(err => {
                                        sendErrorResponse(res, 500, '', `failed to retrieve sequences ${err}`)
                                      })
                                  })
                                  .catch(err => {
                                    if (err) {
                                      sendErrorResponse(res, 500, '', JSON.stringify(err))
                                    }
                                  })
                              })
                              .catch(err => {
                                if (err) {
                                  sendErrorResponse(res, 500, '', JSON.stringify(err))
                                }
                              })
                          })
                          .catch(err => {
                            if (err) {
                              sendErrorResponse(res, 500, '', JSON.stringify(err))
                            }
                          })
                      })
                      .catch(err => {
                        if (err) {
                          sendErrorResponse(res, 500, '', JSON.stringify(err))
                        }
                      })
                  })
                  .catch(err => {
                    if (err) {
                      sendErrorResponse(res, 500, '', JSON.stringify(err))
                    }
                  })
              })
              .catch(err => {
                if (err) {
                  sendErrorResponse(res, 500, '', JSON.stringify(err))
                }
              })
          })
        })
        .catch(err => {
          if (err) {
            sendErrorResponse(res, 500, '', JSON.stringify(err))
          }
        })
    })
    .catch(err => {
      if (err) {
        sendErrorResponse(res, 500, '', `Internal Server Error ${err}`)
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

  callApi.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 500, '', 'The user account does not belong to any company. Please contact support')
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
                  let payload = {
                    broadcastsgraphdata: broadcastsgraphdata,
                    pollsgraphdata: pollsgraphdata,
                    surveysgraphdata: surveysgraphdata
                  }
                  sendSuccessResponse(res, 200, payload)
                })
                .catch(err => {
                  if (err) {
                    sendErrorResponse(res, 500, '', `Error in getting surveys count ${JSON.stringify(err)}`)
                  }
                })
                .catch(err => {
                  if (err) {
                    sendErrorResponse(res, 500, '', `Error in getting surveys count ${JSON.stringify(err)}`)
                  }
                })
            })
            .catch(err => {
              if (err) {
                sendErrorResponse(res, 500, '', `Error in getting surveys count ${JSON.stringify(err)}`)
              }
            })
        })
        .catch(err => {
          sendErrorResponse(res, 500, '', `Error in getting surveys count ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      if (err) {
        sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
      }
    })
}
function graphDataNew (body, companyUser, pageIds) {
  return new Promise(function (resolve, reject) {
    let groupAggregate = {
      _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
      count: {$sum: 1}}
    PageBroadcastDataLayer.aggregateForBroadcasts(LogicLayer.getCriterias(body, companyUser, false, pageIds), groupAggregate)
      .then(broadcastsgraphdata => {
        logger.serverLog(TAG, `broadcastsgraphdata ${broadcastsgraphdata}`, 'debug')
        PagePollDataLayer.aggregateForPolls(LogicLayer.getCriterias(body, companyUser), groupAggregate)
          .then(pollsgraphdata => {
            PageSurveyDataLayer.aggregateForSurveys(LogicLayer.getCriterias(body, companyUser, false, pageIds), groupAggregate)
              .then(surveysgraphdata => {
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
  callApi.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      callApi.callApi('pages/query', 'post', {connected: true, companyId: companyUser.companyId})
        .then(pages => {
          callApi.callApi('subscribers/aggregate', 'post', [
            {$match: {companyId: companyUser.companyId}}, {
              $group: {
                _id: {pageId: '$pageId'},
                count: {$sum: 1}
              }
            }])
            .then(gotSubscribersCount => {
              logger.serverLog(TAG, `pages: ${pages}`, 'debug')
              logger.serverLog(TAG, `gotSubscribersCount ${gotSubscribersCount}`, 'debug')
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
              logger.serverLog(TAG, `pagesPayload: ${pagesPayload}`, 'debug')
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
              sendSuccessResponse(res, 200, top10)
            })
            .catch(err => {
              if (err) {
                sendErrorResponse(res, 500, '', `Error in getting pages subscriber count ${err}`)
              }
            })
        })
        .catch(err => {
          if (err) {
            sendErrorResponse(res, 500, '', `Error in getting pages ${err}`)
          }
        })
    })
    .catch(err => {
      if (err) {
        sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
      }
    })
}

exports.getAllSubscribers = function (req, res) {
  let search = new RegExp('.*' + req.body.filter_criteria.search_value + '.*', 'i')
  let findCriteria = {
    pageId: req.params.pageid,
    companyId: req.user.companyId,
    $or: [{firstName: {$regex: search}}, {lastName: {$regex: search}}],
    gender: req.body.filter_criteria.gender_value !== '' ? req.body.filter_criteria.gender_value : {$exists: true},
    locale: req.body.filter_criteria.locale_value !== '' ? req.body.filter_criteria.locale_value : {$exists: true},
    $limit: req.body.number_of_records
  }
  if (req.body.first_page === 'first') {
    callApi.callApi('subscribers/aggregate', 'post', [
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ])
      .then(subscribersCount => {
        callApi.callApi('subscribers/query', 'post', findCriteria)
          .then(subscribers => {
            let payload = {
              subscribers: subscribers,
              count: subscribers.length > 0 ? subscribersCount[0].count : ''
            }
            sendSuccessResponse(res, 200, payload)
          })
          .catch(err => {
            if (err) {
              sendErrorResponse(res, 500, '', `Error in getting subscribers ${JSON.stringify(err)}`)
            }
          })
      })
      .catch(err => {
        if (err) {
          sendErrorResponse(res, 500, '', 'Subscribers not found')
        }
      })
  } else if (req.body.first_page === 'next') {
    callApi.callApi('subscribers/aggregate', 'post', [
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ])
      .then(subscribersCount => {
        callApi.callApi('subscribers/query', 'post', Object.assign(findCriteria, {_id: {$gt: req.body.last_id}}))
          .then(subscribers => {
            let payload = {
              subscribers: subscribers,
              count: subscribers.length > 0 ? subscribersCount[0].count : ''
            }
            sendSuccessResponse(res, 200, payload)
          })
          .catch(err => {
            if (err) {
              sendErrorResponse(res, 500, '', `Error in getting subscribers ${JSON.stringify(err)}`)
            }
          })
      })
      .catch(err => {
        if (err) {
          sendErrorResponse(res, 404, '', 'BroadcastsCount not found')
        }
      })
  } else if (req.body.first_page === 'previous') {
    callApi.callApi('subscribers/query', 'post', [
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ])
      .then(subscribersCount => {
        callApi.callApi('subscribers/query', Object.assign(findCriteria, {_id: {$lt: req.body.last_id}}))
          .then(subscribers => {
            let payload = {
              subscribers: subscribers,
              count: subscribers.length > 0 ? subscribersCount[0].count : ''
            }
            sendSuccessResponse(res, 200, payload)
          })
          .catch(err => {
            if (err) {
              sendErrorResponse(res, 500, '', `Error in getting subscribers ${JSON.stringify(err)}`)
            }
          })
      })
      .catch(err => {
        if (err) {
          sendErrorResponse(res, 404, '', 'BroadcastsCount not found')
        }
      })
  }
}
exports.updateSubscriptionPermission = function (req, res) {
  callApi.callApi('pages/query', 'post', {companyId: req.user.companyId, isApproved: true})
    .then(userPages => {
      userPages.forEach((page) => {
        needle.get(
          `https://graph.facebook.com/v2.10/${page.pageId}?fields=access_token&access_token=${req.user.facebookInfo.fbToken}`,
          (err, resp) => {
            console.log('respp body in updateSubscriptionPermission ', resp.body)
            if (err) {
              logger.serverLog(TAG,
                `Page access token from graph api error ${JSON.stringify(
                  err)}`, 'error')
            }
            if (resp && resp.body & resp.body.error) {
              sendOpAlert(resp.body.error, 'dashboard controller in kiboengage', page._id, page.userId, page.companyId)
            }
            if (resp && resp.body && resp.body.access_token) {
              needle.get(
                `https://graph.facebook.com/v2.11/me/messaging_feature_review?access_token=${resp.body.access_token}`,
                (err, respp) => {
                  if (err) {
                    logger.serverLog(TAG,
                      `Page access token from graph api error ${JSON.stringify(
                        err)}`, 'error')
                  }
                  if (respp.body.error) {
                    sendOpAlert(respp.body.error, 'dashboard controller in kiboengage', page._id, page.userId, page.companyId)
                  }
                  if (respp && respp.body && respp.body.data && respp.body.data.length > 0) {
                    for (let a = 0; a < respp.body.data.length; a++) {
                      if (respp.body.data[a].feature === 'subscription_messaging' && respp.body.data[a].status === 'approved') {
                        callApi.callApi(`pages/${page._id}`, 'put', {gotPageSubscriptionPermission: true}) // disconnect page
                          .then(updated => {
                          })
                          .catch(err => {
                          })
                      }
                    }
                  }
                })
            }
          })
      })
      sendSuccessResponse(res, 200)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
    })
}
exports.subscriberSummary = function (req, res) {
  callApi.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      callApi.callApi(`pages/query`, 'post', {connected: true, companyId: companyUser.companyId}) // fetch connected pages
        .then(pages => {
          populateIds(pages, true).then(result => {
            callApi.callApi('subscribers/aggregate', 'post', LogicLayer.queryForSubscribers(req.body, companyUser, true, result.pageIds))
              .then(subscribers => {
                callApi.callApi('subscribers/aggregate', 'post', LogicLayer.queryForSubscribers(req.body, companyUser, false, result.pageIds))
                  .then(unsubscribes => {
                    callApi.callApi('subscribers/aggregate', 'post', LogicLayer.queryForSubscribersGraph(req.body, companyUser, true, result.pageIds))
                      .then(graphdata => {
                        let data = {
                          subscribes: subscribers.length > 0 ? subscribers[0].count : 0,
                          unsubscribes: unsubscribes.length > 0 ? unsubscribes[0].count : 0,
                          graphdata: graphdata
                        }
                        sendSuccessResponse(res, 200, data)
                      })
                      .catch(err => {
                        sendErrorResponse(res, 500, '', `Error in getting graphdata ${JSON.stringify(err)}`)
                      })
                  })
                  .catch(err => {
                    sendErrorResponse(res, 500, '', `Error in getting unsubscribers ${JSON.stringify(err)}`)
                  })
              })
              .catch(err => {
                sendErrorResponse(res, 500, '', `Error in getting subscribers ${JSON.stringify(err)}`)
              })
          })
        })
        .catch(err => {
          sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
    })
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
      AutopostingDataLayer.findAutopostingUsingAggregate(criteria, groupCriteraType)
        .then(autoposting => {
          callback(null, autoposting)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      AutopostingMessagesDataLayer.findAutopostingMessageUsingAggregate(cameCriteria.facebook, groupCriteriaMessages)
        .then(facebookAutopostingsCame => {
          callback(null, facebookAutopostingsCame)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      AutopostingMessagesDataLayer.findAutopostingMessageUsingAggregate(cameCriteria.twitter, groupCriteriaMessages)
        .then(twitterAutopostingsCame => {
          callback(null, twitterAutopostingsCame)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      AutopostingMessagesDataLayer.findAutopostingMessageUsingAggregate(cameCriteria.wordpress, groupCriteriaMessages)
        .then(wordpressAutopostingsCame => {
          callback(null, wordpressAutopostingsCame)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      AutopostingMessagesDataLayer.findAutopostingMessageUsingAggregate(cameCriteria.facebook, groupCriteriaGraph)
        .then(facebookAutopostingGraph => {
          callback(null, facebookAutopostingGraph)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      AutopostingMessagesDataLayer.findAutopostingMessageUsingAggregate(cameCriteria.twitter, groupCriteriaGraph)
        .then(twitterAutopostingGraph => {
          callback(null, twitterAutopostingGraph)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      AutopostingMessagesDataLayer.findAutopostingMessageUsingAggregate(cameCriteria.wordpress, groupCriteriaGraph)
        .then(wordpressAutopostingGraph => {
          callback(null, wordpressAutopostingGraph)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      callApi.callApi('autoposting_fb_post/query', 'post', postCriteria, 'kiboengage')
        .then(postsInfo => {
          callback(null, postsInfo)
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      sendErrorResponse(res, 500, '', `Failed to fetch autoposting analytics ${err}`)
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
      sendSuccessResponse(res, 200, payload)
    }
  })
}
