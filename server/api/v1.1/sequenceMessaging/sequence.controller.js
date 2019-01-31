const SequenceMessageQueueDatalayer = require('../sequenceMessageQueue/sequenceMessageQueue.datalayer')
const SequenceDatalayer = require('./sequence.datalayer')
const SequenceUtility = require('./utility')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/sequenceMessaging/sequence.controller.js'

exports.allMessages = function (req, res) {
  SequenceDatalayer.genericFindForSequenceMessages({ sequenceId: req.params.id })
    .then(messages => {
      return res.status(200).json({ status: 'success', payload: messages })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error in fetching sequence messages${JSON.stringify(err)}`
      })
    })
}

exports.allSequences = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
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
                        return res.status(200).json({ status: 'success', payload: sequencePayload })
                      }
                    })
                    .catch(err => {
                      return res.status(500).json({
                        status: 'failed',
                        description: `Internal Server Error in fetching sequence subscribers ${JSON.stringify(err)}`
                      })
                    })
                })
                .catch(err => {
                  return res.status(500).json({
                    status: 'failed',
                    description: `Internal Server Error in fetching sequence messages${JSON.stringify(err)}`
                  })
                })
            })
          } else {
            return res.status(200).json({ status: 'success', payload: [] })
          }
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error in fetching sequences ${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error while fetching company user ${JSON.stringify(err)}`
      })
    })
}

exports.subscriberSequences = function (req, res) {
  SequenceDatalayer.genericFindForSequenceSubscribers({ subscriberId: req.params.id, status: 'subscribed' })
    .then(subscribers => {
      return res.status(200).json({ status: 'success', payload: subscribers })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error in fetching subscriber sequences ${JSON.stringify(err)}`
      })
    })
}

exports.deleteMessage = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
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
              return res.status(201).json({ status: 'success', payload: result })
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `Internal Server Error in deleting sequence message queue${JSON.stringify(err)}`
              })
            })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error in deleting sequence message ${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error in fetching company user ${JSON.stringify(err)}`
      })
    })
}

exports.deleteSequence = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      SequenceDatalayer.deleteSequence(req.params.id)
        .then(result => {
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
                      res.status(201).json({ status: 'success', payload: result })
                    })
                    .catch(err => {
                      return res.status(500).json({
                        status: 'failed',
                        description: `Internal Server Error in deleting sequence messages ${JSON.stringify(err)}`
                      })
                    })
                })
                .catch(err => {
                  return res.status(500).json({
                    status: 'failed',
                    description: `Internal Server Error in deleting sequence message queue ${JSON.stringify(err)}`
                  })
                })
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `Internal Server Error in deleting sequence subscribers ${JSON.stringify(err)}`
              })
            })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error in deleting sequence ${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error in fetching company user ${JSON.stringify(err)}`
      })
    })
}

exports.createSequence = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      utility.callApi(`companyProfile/query`, 'post', {ownerId: req.user._id}, req.headers.authorization)
        .then(companyProfile => {
          // calling accounts feature usage for this
          utility.callApi(`featureUsage/planQuery`, 'post', {planId: companyProfile.planId}, req.headers.authorization)
            .then(planUsage => {
              utility.callApi('featureUsage/companyQuery', 'post', {companyId: companyProfile._id}, req.headers.authorization)
                .then(companyUsage => {
                  if (planUsage.broadcast_sequences !== -1 && companyUsage.broadcast_sequences >= planUsage.broadcast_sequences) {
                    return res.status(500).json({
                      status: 'failed',
                      description: `Your sequences limit has reached. Please upgrade your plan to premium in order to create more sequences.`
                    })
                  }
                  let sequencePayload = {
                    name: req.body.name,
                    companyId: companyUser.companyId,
                    userId: req.user._id
                  }
                  SequenceDatalayer.createSequence(sequencePayload)
                    .then(sequenceCreated => {
                      utility.callApi(`featureUsage/updateCompany`, 'put', {query: {companyId: companyProfile._id}, newPayload: {$inc: { broadcast_sequences: 1 }}, options: {}}, req.headers.authorization)
                        .then(result => {
                          require('./../../../config/socketio').sendMessageToClient({
                            room_id: companyUser.companyId,
                            body: {
                              action: 'sequence_create',
                              payload: {
                                sequence_id: sequenceCreated._id
                              }
                            }
                          })
                          return res.status(201).json({status: 'success', payload: sequenceCreated})
                        })
                        .catch(err => {
                          return res.status(500).json({
                            status: 'failed',
                            description: `Internal Server Error in updating company usage ${JSON.stringify(err)}`
                          })
                        })
                    })
                    .catch(err => {
                      return res.status(500).json({
                        status: 'failed',
                        description: `Internal Server Error in saving subscriber ${JSON.stringify(err)}`
                      })
                    })
                })
                .catch(err => {
                  return res.status(500).json({
                    status: 'failed',
                    description: `Internal Server Error in fetching company usage ${JSON.stringify(err)}`
                  })
                })
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `Internal Server Error in fetching company usage ${JSON.stringify(err)}`
              })
            })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error in fetching company profile ${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error in fetching company user ${JSON.stringify(err)}`
      })
    })
}

exports.editSequence = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
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
          res.status(201).json({ status: 'success', payload: newSequence })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error in updating sequence ${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error while fetching company user ${JSON.stringify(err)}`
      })
    })
}

exports.createMessage = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      utility.callApi(`companyProfile/query`, 'post', {ownerId: req.user._id}, req.headers.authorization)
        .then(companyProfile => {
          // calling accounts feature usage for this
          utility.callApi(`featureUsage/planQuery`, 'post', {planId: companyProfile.planId}, req.headers.authorization)
            .then(planUsage => {
              utility.callApi('featureUsage/companyQuery', 'post', {companyId: companyProfile._id}, req.headers.authorization)
                .then(companyUsage => {
                  if (planUsage.messages_per_sequence !== -1 && companyUsage.messages_per_sequence >= planUsage.messages_per_sequence) {
                    return res.status(500).json({
                      status: 'failed',
                      description: `Your sequence messages limit has reached. Please upgrade your plan to premium in order to create more messages.`
                    })
                  }
                  let messagePayload = {
                    schedule: req.body.schedule,
                    sequenceId: req.body.sequenceId,
                    payload: req.body.payload,
                    title: req.body.title
                  }
                  SequenceDatalayer.createMessage(messagePayload)
                    .then(messageCreated => {
                      utility.callApi(`featureUsage/updateCompany`, 'put', {query: {companyId: companyProfile._id}, newPayload: {$inc: { messages_per_sequence: 1 }}, options: {}}, req.headers.authorization)
                        .then(result => {
                          logger.serverLog('Message Created:', messageCreated)
                          if (messageCreated.trigger.event === 'none') {
                            let utcDate = SequenceUtility.setScheduleDate(messageCreated.schedule)
                            SequenceUtility.addToMessageQueue(req.body.sequenceId, utcDate, messageCreated._id)
                          } else if (['does_not_see', 'does_not_click'].indexOf(messageCreated.trigger.event) > -1) {
                            SequenceUtility.checkParentMessageTrigger(messageCreated)
                          }
                          require('./../../../config/socketio').sendMessageToClient({
                            room_id: companyUser.companyId,
                            body: {
                              action: 'sequence_update',
                              payload: {
                                sequence_id: req.body.sequenceId
                              }
                            }
                          })
                          return res.status(201).json({status: 'success', payload: messageCreated})
                        })
                        .catch(err => {
                          return res.status(500).json({
                            status: 'failed',
                            description: `Internal Server Error in updating company usage ${JSON.stringify(err)}`
                          })
                        })
                    })
                    .catch(err => {
                      return res.status(500).json({
                        status: 'failed',
                        description: `Internal Server Error in saving subscriber ${JSON.stringify(err)}`
                      })
                    })
                })
                .catch(err => {
                  return res.status(500).json({
                    status: 'failed',
                    description: `Internal Server Error in fetching company usage ${JSON.stringify(err)}`
                  })
                })
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `Internal Server Error in fetching company usage ${JSON.stringify(err)}`
              })
            })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error in fetching company profile ${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error in fetching company user ${JSON.stringify(err)}`
      })
    })
}

exports.editMessage = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
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
          return res.status(201).json({ status: 'success', payload: newMessage })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error in updating message ${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error in fetching company user ${JSON.stringify(err)}`
      })
    })
}

exports.setSchedule = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      SequenceDatalayer.genericFindByIdAndUpdateMessage({_id: req.body.messageId}, {schedule: {condition: req.body.condition, days: req.body.days, date: req.body.date}})
        .then(message => {
          if (!message) {
            return res.status(404).json({ status: 'failed', description: 'Record not found' })
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
                    return res.status(201).json({ status: 'success', payload: message })
                  })
                  .catch(err => {
                    return res.status(500).json({
                      status: 'failed',
                      description: `Internal Server Error in updating sequence message schedule ${JSON.stringify(err)}`
                    })
                  })
              } else {
                return res.status(201).json({ status: 'success', payload: message })
              }
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `Internal Server Error in getting sequence subscribers ${JSON.stringify(err)}`
              })
            })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error in updating schedule ${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error in fetching company user ${JSON.stringify(err)}`
      })
    })
}

exports.getAll = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
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
                          res.status(200).json({
                            status: 'success',
                            payload: { sequences: sequencePayload, count: sequencePayload.length > 0 ? sequenceCount[0].count : '' }
                          })
                        }
                      })
                      .catch(err => {
                        return res.status(500).json({
                          status: 'failed',
                          description: `Internal Server Error in fetching sequence subscribers ${JSON.stringify(err)}`
                        })
                      })
                  })
                  .catch(err => {
                    return res.status(500).json({
                      status: 'failed',
                      description: `Internal Server Error in fetching sequence messages ${JSON.stringify(err)}`
                    })
                  })
              })
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `Internal Server Error in fetching sequences ${JSON.stringify(err)}`
              })
            })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error in fetching sequence aggregate object ${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error in fetching company user ${JSON.stringify(err)}`
      })
    })
}

exports.subscribeToSequence = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      req.body.subscriberIds.forEach(subscriberId => {
        SequenceDatalayer.genericFindForSequenceMessages({sequenceId: req.body.sequenceId})
          .then(messages => {
            if (messages.length > 0) {
              let sequenceSubscriberPayload = {
                sequenceId: req.body.sequenceId,
                subscriberId: subscriberId,
                companyId: companyUser.companyId,
                status: 'subscribed'
              }
              SequenceDatalayer.createForSequenceSubcriber(sequenceSubscriberPayload)
                .then(subscriberCreated => {
                  messages.forEach(message => {
                    let utcDate = SequenceUtility.setScheduleDate(message.schedule)
                    SequenceUtility.addToMessageQueue(req.body.sequenceId, utcDate, message._id)
                  })
                  if (subscriberId === req.body.subscriberIds[req.body.subscriberIds.length - 1]) {
                    require('./../../../config/socketio').sendMessageToClient({
                      room_id: companyUser.companyId,
                      body: {
                        action: 'sequence_update',
                        payload: {
                          sequence_id: req.body.sequenceId
                        }
                      }
                    })
                    res.status(201).json({ status: 'success', description: 'Subscribers subscribed successfully' })
                  }
                })
                .catch(err => {
                  return res.status(404).json({
                    status: 'failed',
                    description: `Internal server error in creating sequence subscriber ${err}`
                  })
                })
            }
          })
          .catch(err => {
            return res.status(404).json({
              status: 'failed',
              description: `Internal server error in finding sequence messages ${err}`
            })
          })
      })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error in fetching company user ${JSON.stringify(err)}`
      })
    })
}

exports.unsubscribeToSequence = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      req.body.subscriberIds.forEach(subscriberId => {
        SequenceDatalayer.removeForSequenceSubscribers(req.body.sequenceId, subscriberId)
          .then(result => {
            SequenceMessageQueueDatalayer.removeForSequenceSubscribers(req.body.sequenceId, subscriberId)
              .then(result => {
                utility.callApi(`subscribers/${subscriberId}`, 'get', {}, req.headers.authorization)
                  .then(subscriber => {
                    if (subscriber) {
                      SequenceDatalayer.genericFindForSequence({companyId: subscriber.companyId, 'trigger.event': 'unsubscribes_from_other_sequence', 'trigger.value': req.body.sequenceId})
                        .then(sequences => {
                          if (sequences.length > 0) {
                            sequences.forEach(seq => {
                              SequenceDatalayer.genericFindForSequenceMessages({sequenceId: seq._id})
                                .then(messages => {
                                  if (messages.length > 0) {
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
                                          SequenceUtility.addToMessageQueue(seq._id, utcDate, message._id)
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
                                          return res.status(201).json({ status: 'success', description: 'Subscribers unsubscribed successfully' })
                                        }
                                      })
                                      .catch(err => {
                                        logger.serverLog(TAG, `Failed to create sequence subscriber ${err}`, 'error')
                                      })
                                  }
                                })
                                .catch(err => {
                                  logger.serverLog(TAG, `Failed to fecth sequence messages ${err}`, 'error')
                                })
                            })
                          }
                        })
                        .catch(err => {
                          logger.serverLog(TAG, `Failed to fecth sequences ${err}`, 'error')
                        })
                    }
                  })
                  .catch(err => {
                    return res.status(404).json({
                      status: 'failed',
                      description: `Error in fetching subscribers ${err}`
                    })
                  })
              })
              .catch(err => {
                return res.status(404).json({
                  status: 'failed',
                  description: `Internal server error in creating sequence subscriber ${err}`
                })
              })
          })
          .catch(err => {
            return res.status(404).json({
              status: 'failed',
              description: `Internal server error in finding sequence messages ${err}`
            })
          })
      })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error in fetching company user ${JSON.stringify(err)}`
      })
    })
}

exports.testScheduler = function (req, res) {
  let sequencePayload = {
    name: req.body.name
  }
  SequenceDatalayer.createSequence(sequencePayload)
    .then(sequenceCreated => {
      return res.status(201).json({ status: 'success', payload: sequenceCreated })
    })
    .catch(err => {
      res.status(500).json({
        status: 'Failed',
        description: `Failed to insert record ${err}`
      })
    })
}

exports.updateSegmentation = function (req, res) {
  SequenceDatalayer.genericFindByIdAndUpdateMessage({ _id: req.body.messageId }, { segmentation: req.body.segmentation, segmentationCondition: req.body.segmentationCondition })
    .then(result => {
      return res.status(200).json({ status: 'success', payload: result })
    })
    .catch(err => {
      res.status(500).json({
        status: 'Failed',
        description: `Failed to update segmentation ${err}`
      })
    })
}

exports.updateTrigger = function (req, res) {
  if (req.body.type === 'sequence') {
    SequenceDatalayer.genericFindByIdAndUpdateSequence({ _id: req.body.sequenceId }, { trigger: req.body.trigger })
      .then(sequence => {
        return res.status(200).json({ status: 'success', payload: sequence })
      })
      .catch(err => {
        res.status(500).json({
          status: 'Failed',
          description: `Failed to update sequence record ${err}`
        })
      })
  } else if (req.body.type === 'message') { // Logic to update the trigger if the type is message
    SequenceDatalayer.genericFindByIdAndUpdateMessage({ _id: req.body.messageId }, { trigger: req.body.trigger })
      .then(message => {
        SequenceMessageQueueDatalayer.deleteMany({sequenceMessageId: message._id})
          .then(result => {
            let utcDate = SequenceUtility.setScheduleDate(message.schedule)
            SequenceUtility.addToMessageQueue(message.sequenceId, utcDate, message._id)
          })
          .catch(err => {
            res.status(500).json({
              status: 'Failed',
              description: `Failed to delete sequence message queue ${err}`
            })
          })
        let trigger = req.body.trigger
        if (trigger.event === 'clicks') {
          let messageIdToBeUpdated = trigger.value
          // find the message whose payload needs to be updated
          SequenceDatalayer.genericFindForSequenceMessages({ _id: messageIdToBeUpdated })
            .then(seqMessage => {
              if (seqMessage) {
                let tempPayloadArray = []
                let tempButtonsArray = []
                let payLoadArray = seqMessage.payload
                if (payLoadArray.length > 0) {
                  for (let payLoad of payLoadArray) {
                    let buttonArray = payLoad.buttons
                    if (buttonArray.length > 0) {
                      for (let button of buttonArray) {
                        if (button.buttonId === trigger.buttonId) {
                          button.type = 'postback'
                          tempButtonsArray.push(button)
                        }
                      }
                    }
                    tempPayloadArray.push(payLoad)
                  }
                }
                seqMessage.payLoad = tempPayloadArray
                SequenceDatalayer.createMessage(tempPayloadArray)
                  .then(savedMessage => {
                    logger.serverLog('Saved Message:', savedMessage)
                    return res.status(200).json({ status: 'success', payload: savedMessage })
                  })
                  .catch(err => {
                    res.status(500).json({
                      status: 'Failed',
                      description: `Failed to save message ${err}`
                    })
                  })
              }
            })
            .catch(err => {
              res.status(500).json({
                status: 'Failed',
                description: `Failed to fetch message ${err}`
              })
            })
        }
      })
      .catch(err => {
        res.status(500).json({
          status: 'Failed',
          description: `Failed to update message record ${err}`
        })
      })
  }
}
