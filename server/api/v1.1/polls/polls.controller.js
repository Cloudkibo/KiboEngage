const logger = require('../../../components/logger')
const PollResponseDataLayer = require('./pollresponse.datalayer')
const PollDataLayer = require('./polls.datalayer')
const PollLogicLayer = require('./polls.logiclayer')
const PollPageDataLayer = require('../page_poll/page_poll.datalayer')
const needle = require('needle')
const TAG = 'api/v1/polls/polls.controller.js'
const utility = require('../utility')
const notificationsUtility = require('../notifications/notifications.utility')
const async = require('async')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const { prepareSubscribersCriteria } = require('../../global/utility')
const { sendUsingBatchAPI } = require('../../global/sendConversation')
const _ = require('lodash')
const { updateCompanyUsage } = require('../../global/billingPricing')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      PollDataLayer.genericFindForPolls({companyId: companyUser.companyId})
        .then(polls => {
          PollPageDataLayer.genericFind({companyId: companyUser.companyId})
            .then(pollpages => {
              PollResponseDataLayer.aggregateForPollResponse({}, {
                _id: {pollId: '$pollId'},
                count: {$sum: 1}})
                .then(responsesCount1 => {
                  let responsesCount = PollLogicLayer.prepareResponsesPayload(polls, responsesCount1)
                  sendSuccessResponse(res, 200, {polls, pollpages, responsesCount})
                })
                .catch(error => {
                  const message = error || 'Internal Server Error'
                  logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
                  sendErrorResponse(res, 500, `Failed to aggregate poll responses ${JSON.stringify(error)}`)
                })
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to fetch poll pages ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failedto fetch polls ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.allPolls = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      let criterias = PollLogicLayer.getCriterias(req.body, companyUser)
      PollDataLayer.countPolls(criterias.countCriteria[0].$match)
        .then(pollsCount => {
          let aggregateMatch = criterias.fetchCriteria[0].$match
          let aggregateSort = criterias.fetchCriteria[1].$sort
          let aggregateSkip = criterias.fetchCriteria[2].$skip
          let aggregateLimit = criterias.fetchCriteria[3].$limit
          PollDataLayer.aggregateForPolls(aggregateMatch, null, null, aggregateLimit, aggregateSort, aggregateSkip)
            .then(polls => {
              PollPageDataLayer.genericFind({companyId: companyUser.companyId})
                .then(pollpages => {
                  PollResponseDataLayer.aggregateForPollResponse({}, {
                    _id: {pollId: '$pollId'},
                    count: {$sum: 1}})
                    .then(responsesCount1 => {
                      let responsesCount = PollLogicLayer.prepareResponsesPayload(polls, responsesCount1)
                      let payload = {
                        polls: polls,
                        pollpages: pollpages,
                        responsesCount: responsesCount,
                        count: polls.length > 0 ? pollsCount[0].count : 0
                      }
                      sendSuccessResponse(res, 200, payload)
                    })
                    .catch(error => {
                      const message = error || 'Internal Server Error'
                      logger.serverLog(message, `${TAG}: exports.allPolls`, req.body, {user: req.user}, 'error')
                      sendErrorResponse(res, 500, `Failed to aggregate poll responses ${JSON.stringify(error)}`)
                    })
                })
                .catch(error => {
                  const message = error || 'Internal Server Error'
                  logger.serverLog(message, `${TAG}: exports.allPolls`, req.body, {user: req.user}, 'error')
                  sendErrorResponse(res, 500, `Failed to fetch poll pages ${JSON.stringify(error)}`)
                })
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.allPolls`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to fetch polls ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.allPolls`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch polls count ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.allPolls`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.create = function (req, res) {
  utility.callApi(`featureUsage/planQuery`, 'post', {planId: req.user.currentPlan})
    .then(planUsage => {
      planUsage = planUsage[0]
      utility.callApi(`featureUsage/companyQuery`, 'post', {companyId: req.user.companyId})
        .then(companyUsage => {
          companyUsage = companyUsage[0]
          // add paid plan check later
          // if (planUsage.polls !== -1 && companyUsage.polls >= planUsage.polls) {
          //   return res.status(500).json({
          //     status: 'failed',
          //     description: `Your polls limit has reached. Please upgrade your plan to premium in order to create more polls`
          //   })
          // }
          async.parallelLimit([
            function (callback) {
              sendWebhook(req.user, req.body, req.headers.authorization, callback)
            },
            function (callback) {
              createPoll(req.user, req.body, callback)
            }
          ], 10, function (err, results) {
            if (err) {
              const message = err || 'Failed to create poll'
              logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to create poll ${JSON.stringify(err)}`)
            }
            sendSuccessResponse(res, 200, results[1])
          })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch company usage ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to plan usage ${JSON.stringify(error)}`)
    })
}

exports.send = function (req, res) {
  let abort = false
  utility.callApi(`featureUsage/planQuery`, 'post', {planId: req.user.currentPlan})
    .then(planUsage => {
      planUsage = planUsage[0]
      utility.callApi(`featureUsage/companyQuery`, 'post', {companyId: req.user.companyId._id})
        .then(companyUsage => {
          companyUsage = companyUsage[0]
          // add paid plan check later
          // if (planUsage.polls !== -1 && companyUsage.polls >= planUsage.polls) {
          //   return res.status(500).json({
          //     status: 'failed',
          //     description: `Your polls limit has reached. Please upgrade your plan to premium in order to send more polls`
          //   })
          // }
          sendPoll(req, res, planUsage, companyUsage, abort)
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.send`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch company usage ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.send`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to plan usage ${JSON.stringify(error)}`)
    })
}
exports.sendPollDirectly = function (req, res) {
  let abort = false
  utility.callApi(`featureUsage/planQuery`, 'post', {planId: req.user.currentPlan})
    .then(planUsage => {
      planUsage = planUsage[0]
      utility.callApi(`featureUsage/companyQuery`, 'post', {companyId: req.user.companyId})
        .then(companyUsage => {
          companyUsage = companyUsage[0]
          // add paid plan check later
          // if (planUsage.polls !== -1 && companyUsage.polls >= planUsage.polls) {
          //   return res.status(500).json({
          //     status: 'failed',
          //     description: `Your polls limit has reached. Please upgrade your plan to premium in order to send more polls`
          //   })
          // }
          async.parallelLimit([
            function (callback) {
              createPoll(req.user, req.body, callback)
            }
          ], 10, function (err, result) {
            if (err) {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.sendPollDirectly`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to create poll ${JSON.stringify(err)}`)
            }
            let pollCreated = result[0]
            req.body._id = pollCreated._id
            let optionsData = req.body.options
            req.body.options = optionsData.map((o) => o.option)
            req.body.actions = optionsData
            sendPoll(req, res, planUsage, companyUsage, abort)
          })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.sendPollDirectly`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch company usage ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.sendPollDirectly`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to plan usage ${JSON.stringify(error)}`)
    })
}
exports.deletePoll = function (req, res) {
  PollDataLayer.deleteForPolls(req.params.id)
    .then(poll => {
      // update company usage
      updateCompanyUsage(req.user.companyId, 'polls', -1)
      PollPageDataLayer.deleteForPollPage({pollId: req.params.id})
        .then(pollpages => {
          PollResponseDataLayer.deleteForPollResponse({pollId: req.params.id})
            .then(pollresponses => {
              sendSuccessResponse(res, 200)
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.deletePoll`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to delete poll responses ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.deletePoll`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to delete poll pages ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.deletePoll`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to delete poll ${JSON.stringify(error)}`)
    })
}
exports.getAllResponses = function (req, res) {
  PollResponseDataLayer.genericFindForPollResponse({})
    .then(pollresponses => {
      sendSuccessResponse(res, 200, pollresponses)
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.getAllResponses`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch responses ${JSON.stringify(error)}`)
    })
}
exports.getresponses = function (req, res) {
  PollResponseDataLayer.genericFindForPollResponse({pollId: req.params.id})
    .then(pollresponses => {
      if (pollresponses.length > 0) {
        populateResponses(pollresponses, req)
          .then(result => {
            sendSuccessResponse(res, 200, result)
          })
      } else {
        sendSuccessResponse(res, 200, pollresponses)
      }
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.getresponses`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch responses ${JSON.stringify(error)}`)
    })
}

function populateResponses (responses, req) {
  return new Promise(function (resolve, reject) {
    let payload = []
    for (let i = 0; i < responses.length; i++) {
      utility.callApi(`subscribers/query`, 'post', {_id: responses[i].subscriberId})
        .then(subscribers => {
          payload.push({
            _id: responses[i]._id,
            datetime: responses[i].datetime,
            pollId: responses[i].pollId,
            response: responses[i].response,
            subscriberId: subscribers[0]
          })
          if (payload.length === responses.length) {
            resolve(payload)
          }
        })
    }
  })
}

const _savePagePoll = (data) => {
  PollPageDataLayer.createForPollPage(data)
    .then(savedpagebroadcast => {
      require('../../global/messageStatistics').record('polls')
    })
    .catch(error => {
      const message = error || 'Failed to create page_poll'
      logger.serverLog(message, `${TAG}: _savePagePoll`, data, {}, 'error')
    })
}

const sendPoll = (req, res, planUsage, companyUsage, abort) => {
  let pagesFindCriteria = PollLogicLayer.pagesFindCriteria(req.user, req.body)
  utility.callApi(`pages/query`, 'post', pagesFindCriteria)
    .then(pages => {
      if (pages.length > 0) {
        const page = pages[0]
        const messageData = PollLogicLayer.prepareMessageData(req.body)
        let pagePollData = {
          pageId: page.pageId,
          userId: req.user._id,
          companyId: req.user.companyId,
          pollId: req.body._id,
          seen: false,
          sent: false
        }
        let reportObj = {
          successful: 0,
          unsuccessful: 0,
          errors: []
        }
        if (req.body.isList) {
          utility.callApi(`lists/query`, 'post', PollLogicLayer.ListFindCriteria(req.body, req.user))
            .then(lists => {
              let subsFindCriteria = prepareSubscribersCriteria(req.body, page, lists, 1, req.body.isApprovedForSMP)
              sendUsingBatchAPI('poll', [messageData], {criteria: subsFindCriteria}, page, req.user, reportObj, _savePagePoll, pagePollData)
              sendSuccessResponse(res, 200, '', 'Conversation sent successfully!')
            })
            .catch(error => {
              const message = error || 'Failed to fetch lists see server logs for more info'
              logger.serverLog(message, `${TAG}: sendPoll`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to fetch lists see server logs for more info`)
            })
        } else {
          let subsFindCriteria = prepareSubscribersCriteria(req.body, page, undefined, 1, req.body.isApprovedForSMP)
          utility.callApi(`tags/query`, 'post', { companyId: req.user.companyId, tag: { $in: req.body.segmentationTags } })
            .then(tags => {
              let segmentationTags = tags.map(t => t._id)
              if (segmentationTags.length > 0 || req.body.segmentationPoll.length > 0) {
                let requests = []
                requests.push(utility.callApi(`tags_subscriber/query`, 'post', { companyId: req.user.companyId, tagId: { $in: segmentationTags } }))
                requests.push(PollResponseDataLayer.genericFindForPollResponse({pollId: {$in: req.body.segmentationPoll}}))
                Promise.all(requests)
                  .then(results => {
                    console.log('poll segmentation results', results)
                    let tagSubscribers = null
                    let pollSubscribers = null
                    if (segmentationTags.length > 0) {
                      if (results[0].length > 0) {
                        tagSubscribers = results[0].map((ts) => ts.subscriberId._id)
                      } else {
                        sendErrorResponse(res, 500, '', 'No subscribers match the given criteria')
                      }
                    }
                    if (req.body.segmentationPoll.length > 0) {
                      if (results[1].length > 0) {
                        pollSubscribers = results[1].map((pr) => pr.subscriberId)
                      } else {
                        sendErrorResponse(res, 500, '', 'No subscribers match the given criteria')
                      }
                    }
                    if (tagSubscribers && pollSubscribers) {
                      let subscriberIds = _.intersection(tagSubscribers, pollSubscribers)
                      if (subscriberIds.length > 0) {
                        subsFindCriteria['_id'] = {$in: subscriberIds}
                        sendUsingBatchAPI('poll', [messageData], {criteria: subsFindCriteria}, page, req.user, reportObj, _savePagePoll, pagePollData)
                        sendSuccessResponse(res, 200, '', 'Conversation sent successfully!')
                      } else {
                        sendErrorResponse(res, 500, '', 'No subscribers match the given criteria')
                      }
                    } else if (tagSubscribers) {
                      subsFindCriteria['_id'] = {$in: tagSubscribers}
                      sendUsingBatchAPI('poll', [messageData], {criteria: subsFindCriteria}, page, req.user, reportObj, _savePagePoll, pagePollData)
                      sendSuccessResponse(res, 200, '', 'Conversation sent successfully!')
                    } else if (pollSubscribers) {
                      subsFindCriteria['_id'] = {$in: pollSubscribers}
                      sendUsingBatchAPI('poll', [messageData], {criteria: subsFindCriteria}, page, req.user, reportObj, _savePagePoll, pagePollData)
                      sendSuccessResponse(res, 200, '', 'Conversation sent successfully!')
                    }
                  })
                  .catch(err => {
                    const message = err || 'Failed to fetch tag subscribers or poll responses'
                    logger.serverLog(message, `${TAG}: sendPoll`, req.body, {user: req.user}, 'error')
                    sendErrorResponse(res, 500, 'Failed to fetch tag subscribers or poll responses')
                  })
              } else {
                sendUsingBatchAPI('poll', [messageData], {criteria: subsFindCriteria}, page, req.user, reportObj, _savePagePoll, pagePollData)
                sendSuccessResponse(res, 200, '', 'Conversation sent successfully!')
              }
            })
            .catch(err => {
              const message = err || 'Failed to fetch tags'
              logger.serverLog(message, `${TAG}: sendPoll`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to fetch tags`)
            })
        }
      } else {
        sendErrorResponse(res, 500, 'Page not found!')
      }
    })
    .catch(err => {
      const message = err || 'Failed to fetch page'
      logger.serverLog(message, `${TAG}: sendPoll`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, 'Failed to fetch page')
    })
}

function createPoll (user, body, callback) {
  let pollPayload = PollLogicLayer.preparePollsPayload(user, body)
  PollDataLayer.createForPoll(pollPayload)
    .then(pollCreated => {
      // update company usage
      updateCompanyUsage(user.companyId, 'polls', 1)
      require('./../../../config/socketio').sendMessageToClient({
        room_id: user.companyId,
        body: {
          action: 'poll_created',
          payload: {
            poll_id: pollCreated._id,
            user_id: user._id,
            user_name: user.name,
            company_id: user.companyId
          }
        }
      })
      callback(null, pollCreated)
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: createPoll`, body, {user}, 'error')
      callback(error)
    })
}

function sendWebhook (user, body, token, callback) {
  let pagesFindCriteria = PollLogicLayer.pagesFindCriteria(user, body)
  utility.callApi(`pages/query`, 'post', pagesFindCriteria)
    .then(pages => {
      pages.forEach((page) => {
        utility.callApi(`webhooks/query`, 'post', {pageId: page.pageId})
          .then(webhook => {
            webhook = webhook[0]
            if (webhook && webhook.isEnabled) {
              needle.get(webhook.webhook_url, (err, r) => {
                if (err) {
                  const message = err || 'Internal Server Error'
                  logger.serverLog(message, `${TAG}: sendWebhook`, {body, token}, {user}, 'error')
                  callback(err)
                } else if (r.statusCode === 200) {
                  if (webhook && webhook.optIn.POLL_CREATED) {
                    var data = {
                      subscription_type: 'POLL_CREATED',
                      payload: JSON.stringify({userId: user._id, companyId: user.companyId, statement: body.statement, options: body.options})
                    }
                    needle.post(webhook.webhook_url, data,
                      (error, response) => {
                        if (error) {
                          callback(error)
                        }
                        callback(null, response)
                      })
                  } else {
                    callback(null, 'success')
                  }
                } else {
                  notificationsUtility.saveNotification(webhook)
                  callback(null, 'success')
                }
              })
            } else {
              callback(null, 'success')
            }
          })
          .catch(error => {
            const message = error || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: sendWebhook`, body, {user}, 'error')
            callback(error)
          })
      })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: sendWebhook`, body, {user}, 'error')
      callback(error)
    })
}
