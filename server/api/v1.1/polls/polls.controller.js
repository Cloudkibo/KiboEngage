const logger = require('../../../components/logger')
const PollResponseDataLayer = require('./pollresponse.datalayer')
const PollDataLayer = require('./polls.datalayer')
const PollLogicLayer = require('./polls.logiclayer')
const PollPageDataLayer = require('../page_poll/page_poll.datalayer')
const AutomationQueueDataLayer = require('../automationQueue/automationQueue.datalayer')
const needle = require('needle')
const broadcastUtility = require('../broadcasts/broadcasts.utility')
const TAG = 'api/v1/polls/polls.controller.js'
const utility = require('../utility')
const compUtility = require('../../../components/utility')
const notificationsUtility = require('../notifications/notifications.utility')
const async = require('async')
const broadcastApi = require('../../global/broadcastApi')
const util = require('util')
const { saveLiveChat, preparePayload } = require('../../global/livechat')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
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
                  res.status(200).json({
                    status: 'success',
                    payload: {polls, pollpages, responsesCount}
                  })
                })
                .catch(error => {
                  return res.status(500).json({status: 'failed', payload: `Failed to aggregate poll responses ${JSON.stringify(error)}`})
                })
            })
            .catch(error => {
              return res.status(500).json({status: 'failed', payload: `Failed to fetch poll pages ${JSON.stringify(error)}`})
            })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch polls ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch company user ${JSON.stringify(error)}`})
    })
}
exports.allPolls = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
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
                      res.status(200).json({
                        status: 'success',
                        payload: {polls: polls, pollpages: pollpages, responsesCount: responsesCount, count: polls.length > 0 ? pollsCount[0].count : 0}
                      })
                    })
                    .catch(error => {
                      return res.status(500).json({status: 'failed', payload: `Failed to aggregate poll responses ${JSON.stringify(error)}`})
                    })
                })
                .catch(error => {
                  return res.status(500).json({status: 'failed', payload: `Failed to fetch poll pages ${JSON.stringify(error)}`})
                })
            })
            .catch(error => {
              return res.status(500).json({status: 'failed', payload: `Failed to fetch polls ${JSON.stringify(error)}`})
            })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch pollsCount ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch company user ${JSON.stringify(error)}`})
    })
}

exports.create = function (req, res) {
  utility.callApi(`featureUsage/planQuery`, 'post', {planId: req.user.currentPlan._id}, req.headers.authorization)
    .then(planUsage => {
      planUsage = planUsage[0]
      utility.callApi(`featureUsage/companyQuery`, 'post', {companyId: req.user.companyId}, req.headers.authorization)
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
              console.log('sendWebhook called')
              sendWebhook(req.user, req.body, req.headers.authorization, callback)
            },
            function (callback) {
              console.log('createPoll called')
              createPoll(req.user, req.body, callback)
            }
          ], 10, function (err, results) {
            if (err) {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to create poll ${JSON.stringify(err)}`
              })
            }
            console.log('create results', util.inspect(results))
            res.status(200).json({status: 'success', payload: results[1]})
          })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch company usage ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to plan usage ${JSON.stringify(error)}`
      })
    })
}

exports.send = function (req, res) {
  let abort = false
  utility.callApi(`featureUsage/planQuery`, 'post', {planId: req.user.currentPlan._id}, req.headers.authorization)
    .then(planUsage => {
      planUsage = planUsage[0]
      utility.callApi(`featureUsage/companyQuery`, 'post', {companyId: req.user.companyId._id}, req.headers.authorization)
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
          return res.status(500).json({status: 'failed', payload: `Failed to fetch company usage ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to plan usage ${JSON.stringify(error)}`
      })
    })
}
exports.sendPollDirectly = function (req, res) {
  let abort = false
  utility.callApi(`featureUsage/planQuery`, 'post', {planId: req.user.currentPlan._id}, req.headers.authorization)
    .then(planUsage => {
      planUsage = planUsage[0]
      utility.callApi(`featureUsage/companyQuery`, 'post', {companyId: req.user.companyId}, req.headers.authorization)
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
              return res.status(500).json({status: 'failed', payload: `Failed to create poll ${JSON.stringify(err)}`})
            }
            let pollCreated = result[0]
            req.body._id = pollCreated._id
            sendPoll(req, res, planUsage, companyUsage, abort)
          })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch company usage ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to plan usage ${JSON.stringify(error)}`
      })
    })
}
exports.deletePoll = function (req, res) {
  PollDataLayer.deleteForPolls(req.params.id)
    .then(poll => {
      PollPageDataLayer.deleteForPollPage({pollId: req.params.id})
        .then(pollpages => {
          PollResponseDataLayer.deleteForPollResponse({pollId: req.params.id})
            .then(pollresponses => {
              return res.status(200).json({status: 'success'})
            })
            .catch(error => {
              return res.status(500).json({status: 'failed', payload: `Failed to delete poll responses ${JSON.stringify(error)}`})
            })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to delete poll pages ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to delete poll ${JSON.stringify(error)}`})
    })
}
exports.getAllResponses = function (req, res) {
  PollResponseDataLayer.genericFindForPollResponse({})
    .then(pollresponses => {
      return res.status(200).json({status: 'success', payload: pollresponses})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch responses ${JSON.stringify(error)}`})
    })
}
exports.getresponses = function (req, res) {
  PollResponseDataLayer.genericFindForPollResponse({pollId: req.params.id})
    .then(pollresponses => {
      return res.status(200).json({status: 'success', payload: pollresponses})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch responses ${JSON.stringify(error)}`})
    })
}

function sendPoll (req, res, planUsage, companyUsage, abort) {
  let pagesFindCriteria = PollLogicLayer.pagesFindCriteria(req.user, req.body)
  utility.callApi(`pages/query`, 'post', pagesFindCriteria, req.headers.authorization)
    .then(pages => {
      let page = pages[0]
      const messageData = PollLogicLayer.prepareMessageData(req.body, req.body._id)
      let subsFindCriteria = {}
      if (page.subscriberLimitForBatchAPI < req.body.subscribersCount) {
        broadcastApi.callMessageCreativesEndpoint(messageData, page.accessToken, 'poll')
          .then(messageCreative => {
            if (messageCreative.status === 'success') {
              const messageCreativeId = messageCreative.message_creative_id
              utility.callApi('tags/query', 'post', {companyId: req.user.companyId, pageId: page._id}, req.headers.authorization)
                .then(pageTags => {
                  const limit = Math.ceil(req.body.subscribersCount / 10000)
                  for (let i = 0; i < limit; i++) {
                    let labels = []
                    let unsubscribeTag = pageTags.filter((pt) => pt.tag === `_${page.pageId}_unsubscribe`)
                    let pageIdTag = pageTags.filter((pt) => pt.tag === `_${page.pageId}_${i + 1}`)
                    let notlabels = unsubscribeTag.length > 0 && [unsubscribeTag[0].labelFbId]
                    pageIdTag.length > 0 && labels.push(pageIdTag[0].labelFbId)
                    if (req.body.isList) {
                      utility.callApi(`lists/query`, 'post', PollLogicLayer.ListFindCriteria(req.body, req.user), req.headers.authorization)
                        .then(lists => {
                          lists = lists.map((l) => l.listName)
                          let temp = pageTags.filter((pt) => lists.includes(pt.tag)).map((pt) => pt.labelFbId)
                          labels = labels.concat(temp)
                        })
                        .catch(err => {
                          return res.status(500).json({
                            status: 'failed',
                            description: `Failed to apply list segmentation ${JSON.stringify(err)}`
                          })
                        })
                    } else {
                      if (req.body.segmentationGender.length > 0) {
                        let temp = pageTags.filter((pt) => req.body.segmentationGender.includes(pt.tag)).map((pt) => pt.labelFbId)
                        labels = labels.concat(temp)
                      }
                      if (req.body.segmentationLocale.length > 0) {
                        let temp = pageTags.filter((pt) => req.body.segmentationLocale.includes(pt.tag)).map((pt) => pt.labelFbId)
                        labels = labels.concat(temp)
                      }
                      if (req.body.segmentationTags.length > 0) {
                        let temp = pageTags.filter((pt) => req.body.segmentationTags.includes(pt._id)).map((pt) => pt.labelFbId)
                        labels = labels.concat(temp)
                      }
                    }
                    broadcastApi.callBroadcastMessagesEndpoint(messageCreativeId, labels, notlabels, page.accessToken)
                      .then(response => {
                        if (i === limit - 1) {
                          if (response.status === 'success') {
                            utility.callApi('polls', 'put', {purpose: 'updateOne', match: {_id: req.body._id}, updated: {messageCreativeId, broadcastFbId: response.broadcast_id, APIName: 'broadcast_api'}}, '', 'kiboengage')
                              .then(updated => {
                                return res.status(200)
                                  .json({status: 'success', description: 'Poll sent successfully!'})
                              })
                              .catch(err => {
                                return res.status(500).json({
                                  status: 'failed',
                                  description: `Failed to send poll ${JSON.stringify(err)}`
                                })
                              })
                          } else {
                            return res.status(500).json({
                              status: 'failed',
                              description: `Failed to send poll ${JSON.stringify(response.description)}`
                            })
                          }
                        }
                      })
                      .catch(err => {
                        return res.status(500).json({
                          status: 'failed',
                          description: `Failed to send poll ${JSON.stringify(err)}`
                        })
                      })
                  }
                })
                .catch(err => {
                  return res.status(500).json({
                    status: 'failed',
                    description: `Failed to find tags ${JSON.stringify(err)}`
                  })
                })
            } else {
              return res.status(500).json({
                status: 'failed',
                description: `Failed to send poll ${JSON.stringify(messageCreative.description)}`
              })
            }
          })
          .catch(err => {
            return res.status(500).json({
              status: 'failed',
              description: `Failed to send poll ${JSON.stringify(err)}`
            })
          })
      } else {
        if (req.body.isList) {
          let ListFindCriteria = PollLogicLayer.ListFindCriteria(req.body, req.user)
          utility.callApi(`lists/query`, 'post', ListFindCriteria, req.headers.authorization)
            .then(lists => {
              subsFindCriteria = PollLogicLayer.subsFindCriteria(lists, page)
              sendToSubscribers(req, res, page, subsFindCriteria, messageData, planUsage, companyUsage, abort)
            })
            .catch(error => {
              return res.status(500).json({status: 'failed', payload: `Failed to fetch lists ${JSON.stringify(error)}`})
            })
        } else {
          subsFindCriteria = PollLogicLayer.subscriberFindCriteria(page, req.body)
          sendToSubscribers(req, res, page, subsFindCriteria, messageData, planUsage, companyUsage, abort)
        }
      }
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch page ${error}`})
    })
}

function sendToSubscribers (req, res, page, subsFindCriteria, messageData, planUsage, companyUsage, abort) {
  utility.callApi(`subscribers/query`, 'post', subsFindCriteria, req.headers.authorization)
    .then(subscribers => {
      console.log('subscribers in subFindCriteria', subscribers)
      if (subscribers.length === 0) {
        return res.status(500).json({status: 'failed', description: `No subscribers match the selected criteria`})
      }
      broadcastUtility.applyTagFilterIfNecessary(req, subscribers, (taggedSubscribers) => {
        subscribers = taggedSubscribers
        for (let j = 0; j < subscribers.length && !abort; j++) {
          utility.callApi(`featureUsage/updateCompany`, 'put', {
            query: {companyId: req.user.companyId},
            newPayload: { $inc: { polls: 1 } },
            options: {}
          }, req.headers.authorization)
            .then(updated => {
              if (planUsage.polls !== -1 && companyUsage.polls >= planUsage.polls) {
                abort = true
              }
              const data = {
                messaging_type: 'MESSAGE_TAG',
                recipient: JSON.stringify({id: subscribers[j].senderId}), // this is the subscriber id
                message: JSON.stringify(messageData),
                tag: req.body.fbMessageTag ? req.body.fbMessageTag : 'NON_PROMOTIONAL_SUBSCRIPTION'
              }
              // this calls the needle when the last message was older than 30 minutes
              // checks the age of function using callback
              compUtility.checkLastMessageAge(subscribers[j].senderId, req, (err, isLastMessage) => {
                if (err) {
                  return logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                }
                if (isLastMessage) {
                  needle.post(
                    `https://graph.facebook.com/v2.6/me/messages?access_token=${page.accessToken}`, data, (err, resp) => {
                      if (err) {
                        logger.serverLog(TAG, err)
                      }
                      console.log('pollsend response', util.inspect(resp.body))
                      messageData.componentType = 'poll'
                      let message = preparePayload(req.user, subscribers[j], page, messageData)
                      saveLiveChat(message)
                      let pollBroadcast = PollLogicLayer.preparePollPagePayload(page, req.user, req.body, subscribers[j], req.body._id)
                      PollPageDataLayer.createForPollPage(pollBroadcast)
                        .then(pollCreated => {
                          require('./../../../config/socketio').sendMessageToClient({
                            room_id: req.user.companyId,
                            body: {
                              action: 'poll_send',
                              poll_id: pollCreated._id,
                              user_id: req.user._id,
                              user_name: req.user.name,
                              company_id: req.user.companyId
                            }
                          })
                          if (j === subscribers.length - 1 || abort) {
                            return res.status(200).json({status: 'success', payload: 'Polls sent successfully.'})
                          }
                        })
                        .catch(error => {
                          return res.status(500).json({status: 'failed', payload: `Failed to create poll page ${JSON.stringify(error)}`})
                        })
                    })
                } else {
                  logger.serverLog(TAG, 'agent was engaged just 30 minutes ago ')
                  let timeNow = new Date()
                  AutomationQueueDataLayer.createAutomationQueueObject({
                    automatedMessageId: req.body._id,
                    subscriberId: subscribers[j]._id,
                    companyId: req.user.companyId,
                    type: 'poll',
                    scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)
                  }).then(saved => {
                    if (j === subscribers.length - 1 || abort) {
                      return res.status(200).json({status: 'success', payload: 'Polls sent successfully.'})
                    }
                  })
                    .catch(error => {
                      return res.status(500).json({status: 'failed', payload: `Failed to create automation queue object ${JSON.stringify(error)}`})
                    })
                }
              })
            })
            .catch(error => {
              return res.status(500).json({status: 'failed', payload: `Failed to update company usage ${JSON.stringify(error)}`})
            })
        }
      }, res)
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch subscribers ${JSON.stringify(error)}`})
    })
}

function createPoll (user, body, callback) {
  let pollPayload = PollLogicLayer.preparePollsPayload(user, body)
  PollDataLayer.createForPoll(pollPayload)
    .then(pollCreated => {
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
      callback(error)
    })
}

function sendWebhook (user, body, token, callback) {
  let pagesFindCriteria = PollLogicLayer.pagesFindCriteria(user, body)
  utility.callApi(`pages/query`, 'post', pagesFindCriteria, token)
    .then(pages => {
      pages.forEach((page) => {
        utility.callApi(`webhooks/query`, 'post', {pageId: page.pageId}, token)
          .then(webhook => {
            webhook = webhook[0]
            if (webhook && webhook.isEnabled) {
              needle.get(webhook.webhook_url, (err, r) => {
                if (err) {
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
            callback(error)
          })
      })
    })
    .catch(error => {
      callback(error)
    })
}
