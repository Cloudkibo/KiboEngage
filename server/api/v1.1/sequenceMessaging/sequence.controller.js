const SequenceMessageQueueDatalayer = require('../sequenceMessageQueue/sequenceMessageQueue.datalayer')
const SequenceDatalayer = require('./sequence.datalayer')
const SequenceUtility = require('./utility')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/sequenceMessaging/sequence.controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const { updateCompanyUsage } = require('../../global/billingPricing')

exports.allMessages = function (req, res) {
  SequenceDatalayer.genericFindForSequenceMessages({ sequenceId: req.params.id })
    .then(messages => {
      sendSuccessResponse(res, 200, messages)
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.allMessages`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error in fetching sequence messages${JSON.stringify(err)}`)
    })
}

exports.allSequences = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      SequenceDatalayer.genericFindForSequence({ companyId: companyUser.companyId }, {}, { sort: { datetime: 1 } })
        .then(sequences => {
          let sequencePayload = []
          if (sequences.length > 0) {
            sequences.forEach(sequence => {
              SequenceDatalayer.genericFindForSequenceMessages({ sequenceId: sequence._id })
                .then(messages => {
                  SequenceDatalayer.genericFindForSequenceSubscribers({ sequenceId: sequence._id })
                    .then(subscribers => {
                      sequencePayload.push({
                        sequence: sequence,
                        messages: messages,
                        subscribers: subscribers
                      })
                      if (sequencePayload.length === sequences.length) {
                        sendSuccessResponse(res, 200, sequencePayload)
                      }
                    })
                    .catch(err => {
                      const message = err || 'Internal Server Error'
                      logger.serverLog(message, `${TAG}: exports.allSequences`, req.body, {user: req.user}, 'error')
                      sendErrorResponse(res, 500, '', `Internal Server Error in fetching sequence subscribers ${JSON.stringify(err)}`)
                    })
                })
                .catch(err => {
                  const message = err || 'Internal Server Error'
                  logger.serverLog(message, `${TAG}: exports.allSequences`, req.body, {user: req.user}, 'error')
                  sendErrorResponse(res, 500, '', `Internal Server Error in fetching sequence messages ${JSON.stringify(err)}`)
                })
            })
          } else {
            sendSuccessResponse(res, 200, [])
          }
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.allSequences`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, '', `Internal Server Error in fetching sequences ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.allSequences`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error in fetching companyUser ${JSON.stringify(err)}`)
    })
}

exports.subscriberSequences = function (req, res) {
  SequenceDatalayer.genericFindForSequenceSubscribers({ subscriberId: req.params.id, status: 'subscribed', populate: 'sequenceId' })
    .then(subscribers => {
      sendSuccessResponse(res, 200, subscribers)
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.allSequences`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error in fetching sequence subscribers ${JSON.stringify(err)}`)
    })
}

exports.deleteMessage = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      SequenceDatalayer.deleteSequenceMessage(req.params.id)
        .then(result => {
          SequenceMessageQueueDatalayer.deleteMany({ sequenceMessageId: req.params.id })
            .then(result => {
              require('./../../../config/socketio').sendMessageToClient({
                room_id: companyUser.companyId,
                body: {
                  action: 'sequence_delete',
                  payload: {
                    sequence_id: req.params.id
                  }
                }
              })
              sendSuccessResponse(res, 200, result)
            })
            .catch(err => {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.allSequences`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, '', `Internal Server Error in deleting sequence message queue${JSON.stringify(err)}`)
            })
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.allSequences`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, '', `Internal Server Error in deleting sequence messages ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.allSequences`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error in fetching companyUser${JSON.stringify(err)}`)
    })
}

exports.deleteSequence = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      SequenceDatalayer.deleteSequence(req.params.id)
        .then(result => {
          updateCompanyUsage(req.user.companyId, 'broadcast_sequences', -1)
          SequenceDatalayer.deleteManySequenceSubscribers({ sequenceId: req.params.id })
            .then(result => {
              SequenceMessageQueueDatalayer.deleteMany({ sequenceId: req.params.id })
                .then(result => {
                  SequenceDatalayer.deleteManySequenceMessages({sequenceId: req.params.id})
                    .then(result => {
                      require('./../../../config/socketio').sendMessageToClient({
                        room_id: companyUser.companyId,
                        body: {
                          action: 'sequence_delete',
                          payload: {
                            sequence_id: req.params.id
                          }
                        }
                      })
                      sendSuccessResponse(res, 200, result)
                    })
                    .catch(err => {
                      const message = err || 'Internal Server Error'
                      logger.serverLog(message, `${TAG}: exports.deleteSequence`, req.body, {user: req.user}, 'error')
                      sendErrorResponse(res, 500, '', `Internal Server Error in deleting sequence messages ${JSON.stringify(err)}`)
                    })
                })
                .catch(err => {
                  const message = err || 'Internal Server Error'
                  logger.serverLog(message, `${TAG}: exports.deleteSequence`, req.body, {user: req.user}, 'error')
                  sendErrorResponse(res, 500, '', `Internal Server Error in deleting sequence messages queue ${JSON.stringify(err)}`)
                })
            })
            .catch(err => {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.deleteSequence`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, '', `Internal Server Error in deleting sequence subscribers ${JSON.stringify(err)}`)
            })
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.deleteSequence`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, '', `Internal Server Error in deleting sequence ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.deleteSequence`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error in fetching companyUser ${JSON.stringify(err)}`)
    })
}

exports.createSequence = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email, populate: 'companyId' })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      // calling accounts feature usage for this
      utility.callApi(`featureUsage/planQuery`, 'post', {planId: companyUser.companyId.planId})
        .then(planUsage => {
          planUsage = planUsage[0]
          utility.callApi('featureUsage/companyQuery', 'post', {companyId: companyUser.companyId._id})
            .then(companyUsage => {
              companyUsage = companyUsage[0]
              if (planUsage.broadcast_sequences !== -1 && companyUsage.broadcast_sequences >= planUsage.broadcast_sequences) {
                return res.status(500).json({
                  status: 'failed',
                  description: `Your sequences limit has reached. Please upgrade your plan to create more sequences.`
                })
              } else {
                let sequencePayload = {
                  name: req.body.name,
                  companyId: companyUser.companyId._id,
                  userId: req.user._id
                }
                SequenceDatalayer.createSequence(sequencePayload)
                  .then(sequenceCreated => {
                    updateCompanyUsage(companyUser.companyId._id, 'broadcast_sequences', 1)
                    utility.callApi(`featureUsage/updateCompany`, 'put', {query: {companyId: companyUser.companyId._id}, newPayload: {$inc: { broadcast_sequences: 1 }}, options: {}})
                      .then(result => {
                        require('./../../../config/socketio').sendMessageToClient({
                          room_id: companyUser.companyId._id,
                          body: {
                            action: 'sequence_create',
                            payload: {
                              sequence_id: sequenceCreated._id
                            }
                          }
                        })
                        sendSuccessResponse(res, 200, sequenceCreated)
                      })
                      .catch(err => {
                        const message = err || 'Internal Server Error'
                        logger.serverLog(message, `${TAG}: exports.createSequence`, req.body, {user: req.user}, 'error')
                        sendErrorResponse(res, 500, '', `Internal Server Error in updating company usage ${JSON.stringify(err)}`)
                      })
                  })
                  .catch(err => {
                    const message = err || 'Internal Server Error'
                    logger.serverLog(message, `${TAG}: exports.createSequence`, req.body, {user: req.user}, 'error')
                    sendErrorResponse(res, 500, '', `Internal Server Error in saving subscribers ${JSON.stringify(err)}`)
                  })
              }
            })
            .catch(err => {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.createSequence`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, '', `Internal Server Error in fetching company usage ${JSON.stringify(err)}`)
            })
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.createSequence`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, '', `Internal Server Error in fetching company usage ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.createSequence`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error in fetching company user ${JSON.stringify(err)}`)
    })
}

exports.editSequence = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      SequenceDatalayer.genericFindByIdAndUpdateSequence({_id: req.body.sequenceId}, {name: req.body.name}, req.headers.authorization)
        .then(newSequence => {
          require('./../../../config/socketio').sendMessageToClient({
            room_id: companyUser.companyId,
            body: {
              action: 'sequence_update',
              payload: {
                sequence_id: req.body.sequenceId
              }
            }
          })
          sendErrorResponse(res, 200, '', newSequence)
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.editSequence`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, '', `Internal Server Error in updating sequence ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.editSequence`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error while fetching company user ${JSON.stringify(err)}`)
    })
}

exports.createMessage = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email, populate: 'companyId' })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      // calling accounts feature usage for this
      utility.callApi(`featureUsage/planQuery`, 'post', {planId: companyUser.companyId.planId})
        .then(planUsage => {
          planUsage = planUsage[0]
          utility.callApi('featureUsage/companyQuery', 'post', {companyId: companyUser.companyId._id})
            .then(companyUsage => {
              companyUsage = companyUsage[0]
              if (planUsage.messages_per_sequence !== -1 && companyUsage.messages_per_sequence >= planUsage.messages_per_sequence) {
                return res.status(500).json({
                  status: 'failed',
                  description: `Your sequence messages limit has reached. Please upgrade your plan to create more messages.`
                })
              } else {
                let messagePayload = {
                  schedule: req.body.schedule,
                  sequenceId: req.body.sequenceId,
                  payload: req.body.payload,
                  title: req.body.title
                }
                SequenceDatalayer.createMessage(messagePayload)
                  .then(messageCreated => {
                    utility.callApi(`featureUsage/updateCompany`, 'put', {query: {companyId: companyUser.companyId._id}, newPayload: {$inc: { messages_per_sequence: 1 }}, options: {}})
                      .then(result => {
                        SequenceDatalayer.genericFindForSequenceSubscribers({ sequenceId: req.body.sequenceId })
                          .then(subscribers => {
                            if (subscribers.length > 0) {
                              subscribers.forEach(subscriber => {
                                if (messageCreated.trigger.event === 'none') {
                                  let utcDate = SequenceUtility.setScheduleDate(messageCreated.schedule)
                                  SequenceUtility.addToMessageQueue(req.body.sequenceId, messageCreated._id, subscriber.subscriberId, companyUser.companyId._id, utcDate)
                                } else if (['does_not_see', 'does_not_click'].indexOf(messageCreated.trigger.event) > -1) {
                                  SequenceUtility.checkParentMessageTrigger(messageCreated, subscriber.subscriberId, companyUser.companyId._id)
                                }
                              })
                            }
                          })
                          .catch(err => {
                            const message = err || 'Failed to fetch sequence subscribers'
                            logger.serverLog(message, `${TAG}: exports.createMessage`, req.body, {user: req.user}, 'error')
                          })
                        require('./../../../config/socketio').sendMessageToClient({
                          room_id: companyUser.companyId._id,
                          body: {
                            action: 'sequence_update',
                            payload: {
                              sequence_id: req.body.sequenceId
                            }
                          }
                        })
                        sendSuccessResponse(res, 200, messageCreated)
                      })
                      .catch(err => {
                        const message = err || 'Internal Server Error'
                        logger.serverLog(message, `${TAG}: exports.createMessage`, req.body, {user: req.user}, 'error')
                        sendErrorResponse(res, 500, '', `Internal Server Error in updating company usage ${JSON.stringify(err)}`)
                      })
                  })
                  .catch(err => {
                    const message = err || 'Internal Server Error'
                    logger.serverLog(message, `${TAG}: exports.createMessage`, req.body, {user: req.user}, 'error')
                    sendErrorResponse(res, 500, '', `Internal Server Error in saving subscribers ${JSON.stringify(err)}`)
                  })
              }
            })
            .catch(err => {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.createMessage`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, '', `Internal Server Error in fetching company usage ${JSON.stringify(err)}`)
            })
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.createMessage`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, '', `Internal Server Error in fetching company usage ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.createMessage`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error in fetching company user ${JSON.stringify(err)}`)
    })
}

exports.editMessage = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      SequenceDatalayer.genericFindByIdAndUpdateMessage({_id: req.body._id}, {title: req.body.title, payload: req.body.payload}, req.headers.authorization)
        .then(newMessage => {
          require('./../../../config/socketio').sendMessageToClient({
            room_id: companyUser.companyId,
            body: {
              action: 'sequence_update',
              payload: {
                sequence_id: newMessage.sequenceId
              }
            }
          })
          sendSuccessResponse(res, 200, newMessage)
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.editMessage`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, '', `Internal Server Error in updating message ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.editMessage`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error in fetching company user ${JSON.stringify(err)}`)
    })
}

exports.setSchedule = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      SequenceDatalayer.genericFindByIdAndUpdateMessage({_id: req.body.messageId}, {schedule: {condition: req.body.condition, days: req.body.days, date: req.body.date}})
        .then(message => {
          if (!message) {
            sendErrorResponse(res, 404, '', 'Record not found')
          }
          SequenceDatalayer.genericFindForSequenceSubscribers({sequenceId: req.body.sequenceId})
            .then(subscribers => {
              require('./../../../config/socketio').sendMessageToClient({
                room_id: companyUser.companyId,
                body: {
                  action: 'sequence_update',
                  payload: {
                    sequence_id: message.sequenceId
                  }
                }
              })
              if (subscribers.length > 0) {
                SequenceMessageQueueDatalayer.genericUpdate({ sequenceMessageId: message._id }, { queueScheduledTime: req.body.date }, { multi: true })
                  .then(result => {
                    sendSuccessResponse(res, 200, message)
                  })
                  .catch(err => {
                    const message = err || 'Internal Server Error'
                    logger.serverLog(message, `${TAG}: exports.setSchedule`, req.body, {user: req.user}, 'error')
                    sendErrorResponse(res, 500, '', `Internal Server Error in updating sequence message schedule ${JSON.stringify(err)}`)
                  })
              } else {
                sendSuccessResponse(res, 200, message)
              }
            })
            .catch(err => {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.setSchedule`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, '', `Internal Server Error in getting sequence subscribers ${JSON.stringify(err)}`)
            })
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.setSchedule`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, '', `Internal Server Error in updating schedule ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.setSchedule`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error in fetching company user ${JSON.stringify(err)}`)
    })
}

exports.getAll = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      let search = new RegExp('.*' + req.body.filter_criteria.search_value + '.*', 'i')
      let findCriteria = {
        companyId: companyUser.companyId,
        name: req.body.filter_criteria.search_value !== '' ? { $regex: search } : { $exists: true }
      }
      SequenceDatalayer.countSequences(findCriteria)
        .then(sequenceCount => {
          SequenceDatalayer.genericFindSequenceWithLimit(findCriteria, req.body.number_of_records)
            .then(sequences => {
              let sequencePayload = []
              sequences.forEach(sequence => {
                SequenceDatalayer.genericFindForSequenceMessages({sequenceId: sequence._id})
                  .then(messages => {
                    SequenceDatalayer.genericFindForSequenceSubscribers({sequenceId: sequence._id})
                      .then(subscribers => {
                        sequencePayload.push({
                          sequence: sequence,
                          messages: messages,
                          subscribers: subscribers
                        })
                        if (sequencePayload.length === sequences.length) {
                          sendSuccessResponse(res, 200, { sequences: sequencePayload, count: sequencePayload.length > 0 ? sequenceCount[0].count : '' })
                        }
                      })
                      .catch(err => {
                        const message = err || 'Internal Server Error'
                        logger.serverLog(message, `${TAG}: exports.getAll`, req.body, {user: req.user}, 'error')
                        sendErrorResponse(res, 500, '', `Internal Server Error in fetching sequence subscribers ${JSON.stringify(err)}`)
                      })
                  })
                  .catch(err => {
                    const message = err || 'Internal Server Error'
                    logger.serverLog(message, `${TAG}: exports.getAll`, req.body, {user: req.user}, 'error')
                    sendErrorResponse(res, 500, '', `Internal Server Error in fetching sequence messages ${JSON.stringify(err)}`)
                  })
              })
            })
            .catch(err => {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.getAll`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, '', `Internal Server Error in fetching sequences ${JSON.stringify(err)}`)
            })
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.getAll`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, '', `Internal Server Error in fetching sequence aggregate object ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.getAll`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error in fetching company user ${JSON.stringify(err)}`)
    })
}

exports.subscribeToSequence = function (req, res) {
  let subscribed = false
  req.body.subscriberIds.forEach(subscriberId => {
    SequenceDatalayer.genericFindForSequenceMessages({sequenceId: req.body.sequenceId})
      .then(messages => {
        if (messages.length > 0) {
          SequenceDatalayer.genericFindForSequenceSubscribers({sequenceId: req.body.sequenceId, companyId: req.user.companyId, subscriberId: subscriberId})
            .then(seqSubs => {
              if (seqSubs.length > 0) {
                if (subscriberId === req.body.subscriberIds[req.body.subscriberIds.length - 1]) {
                  if (subscribed) {
                    sendSuccessResponse(res, 200, 'Subscribers subscribed successfully')
                  } else {
                    sendErrorResponse(res, 500, '', 'Subscriber(s) is already subscribed to the sequence')
                  }
                }
              } else {
                let sequenceSubscriberPayload = {
                  sequenceId: req.body.sequenceId,
                  subscriberId: subscriberId,
                  companyId: req.user.companyId,
                  status: 'subscribed'
                }
                SequenceDatalayer.createForSequenceSubcriber(sequenceSubscriberPayload)
                  .then(subscriberCreated => {
                    subscribed = true
                    messages.forEach(message => {
                      if (message.trigger.event === 'none') {
                        let utcDate = SequenceUtility.setScheduleDate(message.schedule)
                        SequenceUtility.addToMessageQueue(req.body.sequenceId, message._id, subscriberId, req.user.companyId, utcDate)
                      } else {
                        SequenceUtility.addToMessageQueue(req.body.sequenceId, message._id, subscriberId, req.user.companyId)
                      }
                    })
                    if (subscriberId === req.body.subscriberIds[req.body.subscriberIds.length - 1]) {
                      require('./../../../config/socketio').sendMessageToClient({
                        room_id: req.user.companyId,
                        body: {
                          action: 'sequence_update',
                          payload: {
                            sequence_id: req.body.sequenceId
                          }
                        }
                      })
                      sendSuccessResponse(res, 200, 'Subscribers subscribed successfully')
                    }
                  })
                  .catch(err => {
                    const message = err || 'Internal server error in creating sequence subscriber'
                    logger.serverLog(message, `${TAG}: exports.subscribeToSequence`, req.body, {user: req.user}, 'error')
                    sendErrorResponse(res, 500, '', 'Failed to subscribe to sequence!')
                  })
              }
            })
            .catch(err => {
              const message = err || 'Internal server error in finding sequence subscriber'
              logger.serverLog(message, `${TAG}: exports.subscribeToSequence`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, '', 'Failed to subscribe to sequence!')
            })
        }
      })
      .catch(err => {
        const message = err || 'Internal server error in finding sequence messages'
        logger.serverLog(message, `${TAG}: exports.subscribeToSequence`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 500, '', 'Failed to subscribe to sequence!')
      })
  })
}

exports.unsubscribeToSequence = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      req.body.subscriberIds.forEach(subscriberId => {
        SequenceDatalayer.removeForSequenceSubscribers(req.body.sequenceId, subscriberId)
          .then(result => {
            SequenceMessageQueueDatalayer.removeForSequenceSubscribers(req.body.sequenceId, subscriberId)
              .then(result => {
                utility.callApi(`subscribers/${subscriberId}`, 'get', {})
                  .then(subscriber => {
                    if (subscriber) {
                      SequenceDatalayer.genericFindForSequence({companyId: subscriber.companyId, 'trigger.event': 'unsubscribes_from_other_sequence', 'trigger.value': req.body.sequenceId})
                        .then(sequences => {
                          if (sequences.length > 0) {
                            sequences.forEach(seq => {
                              SequenceDatalayer.genericFindForSequenceMessages({sequenceId: seq._id})
                                .then(messages => {
                                  if (messages.length > 0) {
                                    SequenceDatalayer.genericFindForSequenceSubscribers({sequenceId: seq._id, companyId: subscriber.companyId, subscriberId: subscriber._id})
                                      .then(seqSubs => {
                                        if (seqSubs.length === 0) {
                                          let sequenceSubscriberPayload = {
                                            sequenceId: seq._id,
                                            subscriberId: subscriber._id,
                                            companyId: subscriber.companyId,
                                            status: 'subscribed'
                                          }
                                          SequenceDatalayer.createForSequenceSubcriber(sequenceSubscriberPayload)
                                            .then(subscriberCreated => {
                                              messages.forEach(message => {
                                                let utcDate = SequenceUtility.setScheduleDate(message.schedule)
                                                SequenceUtility.addToMessageQueue(seq._id, message._id, subscriber._id, subscriber.companyId, utcDate)
                                              })
                                              if (subscriberId === req.body.subscriberIds[req.body.subscriberIds.length - 1]) {
                                                require('./../../../config/socketio').sendMessageToClient({
                                                  room_id: subscriberId.companyId,
                                                  body: {
                                                    action: 'sequence_update',
                                                    payload: {
                                                      sequence_id: req.body.sequenceId
                                                    }
                                                  }
                                                })
                                                sendSuccessResponse(res, 200, 'Subscribers unsubscribed successfully')
                                              }
                                            })
                                            .catch(err => {
                                              const message = err || 'Failed to create sequence subscriber'
                                              logger.serverLog(message, `${TAG}: exports.unsubscribeToSequence`, req.body, {user: req.user}, 'error')
                                            })
                                        }
                                      })
                                      .catch(err => {
                                        const message = err || 'Internal Server Error'
                                        logger.serverLog(message, `${TAG}: exports.unsubscribeToSequence`, req.body, {user: req.user}, 'error')
                                        sendErrorResponse(res, 500, '', `Internal server error in finding sequence subscriber ${err}`)
                                      })
                                  } else {
                                    sendSuccessResponse(res, 200, 'Subscribers unsubscribed successfully')
                                  }
                                })
                                .catch(err => {
                                  const message = err || 'Failed to fecth sequence messages'
                                  logger.serverLog(message, `${TAG}: exports.unsubscribeToSequence`, req.body, {user: req.user}, 'error')
                                })
                            })
                          } else {
                            sendSuccessResponse(res, 200, '', 'Subscribers unsubscribed successfully')
                          }
                        })
                        .catch(err => {
                          const message = err || 'Failed to fecth sequences'
                          logger.serverLog(message, `${TAG}: exports.unsubscribeToSequence`, req.body, {user: req.user}, 'error')
                        })
                    }
                  })
                  .catch(err => {
                    const message = err || 'Internal Server Error'
                    logger.serverLog(message, `${TAG}: exports.unsubscribeToSequence`, req.body, {user: req.user}, 'error')
                    sendErrorResponse(res, 500, '', `Error in fetching subscribers ${err}`)
                  })
              })
              .catch(err => {
                const message = err || 'Internal Server Error'
                logger.serverLog(message, `${TAG}: exports.unsubscribeToSequence`, req.body, {user: req.user}, 'error')
                sendErrorResponse(res, 500, '', `Internal server error in creating sequence subscriber ${err}`)
              })
          })
          .catch(err => {
            const message = err || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: exports.unsubscribeToSequence`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 500, '', `Internal server error in finding sequence messages ${err}`)
          })
      })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.unsubscribeToSequence`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error in fetching company user ${JSON.stringify(err)}`)
    })
}

exports.testScheduler = function (req, res) {
  let sequencePayload = {
    name: req.body.name
  }
  SequenceDatalayer.createSequence(sequencePayload)
    .then(sequenceCreated => {
      sendSuccessResponse(res, 200, sequenceCreated)
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.testScheduler`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Failed to insert record ${err}`)
    })
}

exports.updateSegmentation = function (req, res) {
  SequenceDatalayer.genericFindByIdAndUpdateMessage({ _id: req.body.messageId }, { segmentation: req.body.segmentation, segmentationCondition: req.body.segmentationCondition })
    .then(result => {
      sendSuccessResponse(res, 200, result)
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.updateSegmentation`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Failed to update segmentation ${err}`)
    })
}

exports.updateTrigger = function (req, res) {
  if (req.body.type === 'sequence') {
    SequenceDatalayer.genericFindByIdAndUpdateSequence({ _id: req.body.sequenceId }, { trigger: req.body.trigger })
      .then(sequence => {
        sendSuccessResponse(res, 200, sequence)
      })
      .catch(err => {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.updateTrigger`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 500, '', `Failed to update sequence record ${err}`)
      })
  } else if (req.body.type === 'message') { // Logic to update the trigger if the type is message
    SequenceDatalayer.genericFindByIdAndUpdateMessage({ _id: req.body.messageId }, { trigger: req.body.trigger })
      .then(message => {
        if (req.body.trigger.event === 'none') {
          let utcDate = SequenceUtility.setScheduleDate(message.schedule)
          SequenceMessageQueueDatalayer.genericUpdate({sequenceMessageId: message._id}, {queueScheduledTime: utcDate}, {multi: true})
        } else {
          SequenceMessageQueueDatalayer.genericUpdate({sequenceMessageId: message._id}, {queueScheduledTime: ''}, {multi: true})
        }
        let trigger = req.body.trigger
        if (trigger.event === 'clicks') {
          let messageIdToBeUpdated = trigger.value
          // find the message whose payload needs to be updated
          SequenceDatalayer.genericFindForSequenceMessages({ _id: messageIdToBeUpdated })
            .then(seqMessage => {
              seqMessage = seqMessage[0]
              if (seqMessage) {
                let updatedMessage = seqMessage.payload
                if (updatedMessage.length > 0) {
                  for (let i = 0; i < updatedMessage.length; i++) {
                    if (updatedMessage[i].buttons.length > 0) {
                      for (let j = 0; j < updatedMessage[i].buttons.length; j++) {
                        if (updatedMessage[i].buttons[j].title === trigger.buttonId) {
                          updatedMessage[i].buttons[j].payload = JSON.stringify({
                            action: 'send_sequence_message',
                            messageId: message._id
                          })
                        }
                      }
                    }
                  }
                }
                SequenceDatalayer.genericUpdateForSequenceMessages(
                  {_id: seqMessage._id},
                  {payload: updatedMessage},
                  {}
                )
                  .then(savedMessage => {
                    sendSuccessResponse(res, 200, savedMessage)
                  })
                  .catch(err => {
                    const message = err || 'Internal Server Error'
                    logger.serverLog(message, `${TAG}: exports.updateTrigger`, req.body, {user: req.user}, 'error')
                    sendErrorResponse(res, 500, '', `Failed to save message ${err}`)
                  })
              }
            })
            .catch(err => {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.updateTrigger`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, '', `Failed to fetch message ${err}`)
            })
        } else {
          sendSuccessResponse(res, 200, message)
        }
      })
      .catch(err => {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.updateTrigger`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 500, '', `Failed to update message record ${err}`)
      })
  }
}
