const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/sequence.controller'
const SequenceUtility = require('../sequenceMessaging/utility')
const SequencesDataLayer = require('../sequenceMessaging/sequence.datalayer')
const SequenceMessageQueueDatalayer = require('../sequenceMessageQueue/sequenceMessageQueue.datalayer')

exports.index = function (req, res) {
  logger.serverLog(TAG, `in sequence ${JSON.stringify(req.body)}`)
  return res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
}

exports.subscriberJoins = function (req, res) {
  logger.serverLog(TAG, `in sequence subscriberJoins ${JSON.stringify(req.body)}`, 'debug')

  callApi(`subscribers/query`, 'post', {senderId: req.body.senderId, pageId: req.body.pageId, completeInfo: true})
    .then(subscribers => {
      let subscriber = subscribers[0]
      SequencesDataLayer.genericFindForSequence({companyId: req.body.companyId, 'trigger.event': 'subscriber_joins'})
        .then(sequences => {
          if (sequences.length > 0) {
            sequences.forEach(seq => {
              SequencesDataLayer.genericFindForSequenceMessages({sequenceId: seq._id})
                .then(messages => {
                  if (messages.length > 0) {
                    let sequenceSubscriberPayload = {
                      sequenceId: seq._id,
                      subscriberId: subscriber._id,
                      companyId: req.body.companyId,
                      status: 'subscribed'
                    }
                    SequencesDataLayer.createForSequenceSubcriber(sequenceSubscriberPayload)
                      .then(subscriberCreated => {
                        messages.forEach(message => {
                          if (message.trigger.event === 'none') {
                            let utcDate = SequenceUtility.setScheduleDate(message.schedule)
                            SequenceUtility.addToMessageQueue(seq._id, message._id, subscriber._id, subscriber.companyId, utcDate)
                          } else {
                            SequenceUtility.addToMessageQueue(seq._id, message._id, subscriber._id, subscriber.companyId)
                          }
                        })
                        require('./../../../config/socketio').sendMessageToClient({
                          room_id: req.body.companyId,
                          body: {
                            action: 'sequence_update',
                            payload: {
                              sequence_id: seq._id
                            }
                          }
                        })
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
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fecth sequences ${err}`, 'error')
    })

  return res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
}

exports.handlePollSurveyResponse = function (data) {
  logger.serverLog(TAG, `in sequence handlePollSurveyResponse ${JSON.stringify(data)}`, 'debug')
  if (data.payload.action === 'subscribe') {
    SequencesDataLayer.genericFindForSequenceMessages({sequenceId: data.payload.sequenceId})
      .then(messages => {
        if (messages.length > 0) {
          SequencesDataLayer.genericFindForSequenceSubscribers({sequenceId: data.payload.sequenceId, companyId: data.companyId, subscriberId: data.subscriberId})
            .then(seqSubs => {
              if (seqSubs.length > 0) {
                logger.serverLog(TAG, 'This subscriber is already subscribed to the sequence')
              } else {
                let sequenceSubscriberPayload = {
                  sequenceId: data.payload.sequenceId,
                  subscriberId: data.subscriberId,
                  companyId: data.companyId,
                  status: 'subscribed'
                }
                SequencesDataLayer.createForSequenceSubcriber(sequenceSubscriberPayload)
                  .then(subscriberCreated => {
                    messages.forEach(message => {
                      if (message.trigger.event === 'none') {
                        let utcDate = SequenceUtility.setScheduleDate(message.schedule)
                        SequenceUtility.addToMessageQueue(data.payload.sequenceId, message._id, data.subscriberId, data.companyId, utcDate)
                      } else {
                        SequenceUtility.addToMessageQueue(data.payload.sequenceId, message._id, data.subscriberId, data.companyId)
                      }
                    })
                    require('./../../../config/socketio').sendMessageToClient({
                      room_id: data.companyId,
                      body: {
                        action: 'sequence_update',
                        payload: {
                          sequence_id: data.payload.sequenceId
                        }
                      }
                    })
                  })
                  .catch(err => {
                    logger.serverLog(TAG, `Failed to create sequence subscriber ${err}`, 'error')
                  })
              }
            })
        }
      })
      .catch(err => {
        logger.serverLog(TAG, `Failed to fecth sequence messages ${err}`, 'error')
      })
  } else if (data.payload.action === 'unsubscribe') {
    SequencesDataLayer.removeForSequenceSubscribers(data.payload.sequenceId, data.subscriberId)
      .then(result => {
        SequenceMessageQueueDatalayer.removeForSequenceSubscribers(data.payload.sequenceId, data.subscriberId)
          .then(result => {
            logger.serverLog(TAG, 'Subscriber has unsubscribed successfully!')
          })
          .catch(err => {
            logger.serverLog(TAG, `Internal server error in creating sequence subscriber ${err}`, 'error')
          })
      })
      .catch(err => {
        logger.serverLog(TAG, `Internal server error in finding sequence messages ${err}`, 'error')
      })
  }
}

exports.sendSequenceMessage = (req, res) => {
  let payload = JSON.parse(req.body.entry[0].messaging[0].postback.payload)
  SequencesDataLayer.genericFindForSequenceMessages({_id: payload.messageId})
    .then(message => {
      message = message[0]
      if (message) {
        let utcDate = SequenceUtility.setScheduleDate(message.schedule)
        SequenceMessageQueueDatalayer.genericUpdate({sequenceMessageId: message._id}, {queueScheduledTime: utcDate}, {multi: true})
          .then(updated => {
            logger.serverLog(TAG, `sequence message queue updated succssfully!`)
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to fecth sequence message queue ${err}`, 'error')
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fecth sequence message ${err}`, 'error')
    })
}

exports.subscribeToSequence = (req, res) => {
  console.log('payload received in subscribeToSequence', req.body)
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let resp
  if (req.body.entry[0].messaging[0].message && req.body.entry[0].messaging[0].message.quick_reply) {
    resp = JSON.parse(req.body.entry[0].messaging[0].message.quick_reply.payload)
  } else {
    resp = JSON.parse(req.body.entry[0].messaging[0].postback.payload)
  }
  console.log('resp value in subscribe', resp)
  const sender = req.body.entry[0].messaging[0].sender.id
  const pageId = req.body.entry[0].messaging[0].recipient.id
  let pageQuery = [
    { $match: {pageId: pageId, connected: true} },
    { $lookup: { from: 'companyprofiles', localField: 'companyId', foreignField: '_id', as: 'company' } },
    { '$unwind': '$company' }
  ]
  callApi(`pages/aggregate`, 'post', pageQuery)
    .then(page => {
      page = page[0]
      callApi(`subscribers/query`, 'post', {senderId: sender, pageId: page._id, completeInfo: true})
        .then(subscriber => {
          subscriber = subscriber[0]
          SequencesDataLayer.genericFindForSequenceMessages({sequenceId: resp.sequenceId})
            .then(messages => {
              if (messages.length > 0) {
                SequencesDataLayer.genericFindForSequenceSubscribers({sequenceId: resp.sequenceId, companyId: page.company._id, subscriberId: subscriber._id})
                  .then(seqSubs => {
                    if (seqSubs.length > 0) {
                      logger.serverLog(TAG, 'This subscriber is already subscribed to the sequence')
                    } else {
                      let sequenceSubscriberPayload = {
                        sequenceId: resp.sequenceId,
                        subscriberId: subscriber._id,
                        companyId: page.company._id,
                        status: 'subscribed'
                      }
                      SequencesDataLayer.createForSequenceSubcriber(sequenceSubscriberPayload)
                        .then(subscriberCreated => {
                          messages.forEach(message => {
                            if (message.trigger.event === 'none') {
                              let utcDate = SequenceUtility.setScheduleDate(message.schedule)
                              SequenceUtility.addToMessageQueue(resp.sequenceId, message._id, subscriber._id, page.company._id, utcDate)
                            } else {
                              SequenceUtility.addToMessageQueue(resp.sequenceId, message._id, subscriber._id, page.company._id)
                            }
                          })
                          require('./../../../config/socketio').sendMessageToClient({
                            room_id: page.company._id,
                            body: {
                              action: 'sequence_update',
                              payload: {
                                sequence_id: resp.sequenceId
                              }
                            }
                          })
                          console.log('subsriber subscribed successfully')
                        })
                        .catch(err => {
                          logger.serverLog(TAG, `Failed to fetch sequence subscriber ${err}`, 'error')
                        })
                    }
                  })
                  .catch(err => {
                    logger.serverLog(TAG, `Failed to fetch sequence subscriber ${err}`, 'error')
                  })
              }
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to fetch sequence messages ${err}`, 'error')
            })
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch subscriber ${err}`, 'error')
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch page ${err}`, 'error')
    })
}
exports.unsubscribeFromSequence = (req, res) => {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let resp
  if (req.body.entry[0].messaging[0].message && req.body.entry[0].messaging[0].message.quick_reply) {
    resp = JSON.parse(req.body.entry[0].messaging[0].message.quick_reply.payload)
  } else {
    resp = JSON.parse(req.body.entry[0].messaging[0].postback.payload)
  }
  const sender = req.body.entry[0].messaging[0].sender.id
  const pageId = req.body.entry[0].messaging[0].recipient.id
  let pageQuery = [
    { $match: {pageId: pageId, connected: true} },
    { $lookup: { from: 'companyprofiles', localField: 'companyId', foreignField: '_id', as: 'company' } },
    { '$unwind': '$company' }
  ]
  callApi(`pages/aggregate`, 'post', pageQuery)
    .then(page => {
      page = page[0]
      callApi(`subscribers/query`, 'post', {senderId: sender, pageId: page._id, completeInfo: true})
        .then(subscriber => {
          subscriber = subscriber[0]
          SequencesDataLayer.removeForSequenceSubscribers(resp.sequenceId, subscriber._id)
            .then(result => {
              SequenceMessageQueueDatalayer.removeForSequenceSubscribers(resp.sequenceId, subscriber._id)
                .then(result => {
                  SequencesDataLayer.genericFindForSequence({companyId: subscriber.companyId, 'trigger.event': 'unsubscribes_from_other_sequence', 'trigger.value': resp.sequenceId})
                    .then(sequences => {
                      if (sequences.length > 0) {
                        sequences.forEach(seq => {
                          SequencesDataLayer.genericFindForSequenceMessages({sequenceId: seq._id})
                            .then(messages => {
                              if (messages.length > 0) {
                                SequencesDataLayer.genericFindForSequenceSubscribers({sequenceId: seq._id, companyId: subscriber.companyId, subscriberId: subscriber._id})
                                  .then(seqSubs => {
                                    if (seqSubs.length > 0) {
                                      logger.serverLog(TAG, 'This subscriber is already subscribed to the sequence')
                                    } else {
                                      let sequenceSubscriberPayload = {
                                        sequenceId: seq._id,
                                        subscriberId: subscriber._id,
                                        companyId: subscriber.companyId,
                                        status: 'subscribed'
                                      }
                                      SequencesDataLayer.createForSequenceSubcriber(sequenceSubscriberPayload)
                                        .then(subscriberCreated => {
                                          messages.forEach(message => {
                                            let utcDate = SequenceUtility.setScheduleDate(message.schedule)
                                            SequenceUtility.addToMessageQueue(seq._id, message._id, subscriber._id, subscriber.companyId, utcDate)
                                          })
                                          require('./../../../config/socketio').sendMessageToClient({
                                            room_id: subscriber.companyId,
                                            body: {
                                              action: 'sequence_update',
                                              payload: {
                                                sequence_id: req.body.sequenceId
                                              }
                                            }
                                          })
                                          logger.serverLog(TAG, `Subscribers unsubscribed successfully`)
                                        })
                                        .catch(err => {
                                          logger.serverLog(TAG, `Failed to create sequence subscriber ${err}`, 'error')
                                        })
                                    }
                                  })
                                  .catch(err => {
                                    logger.serverLog(TAG, `Failed to fetch sequence subscriber ${err}`, 'error')
                                  })
                              } else {
                                logger.serverLog(TAG, `Subscribers unsubscribed successfully`)
                              }
                            })
                            .catch(err => {
                              logger.serverLog(TAG, `Failed to fecth sequence messages ${err}`, 'error')
                            })
                        })
                      } else {
                        logger.serverLog(TAG, `Subscribers unsubscribed successfully`)
                      }
                    })
                    .catch(err => {
                      logger.serverLog(TAG, `Failed to fecth sequences ${err}`, 'error')
                    })
                })
                .catch(err => {
                  logger.serverLog(TAG, `Failed to creating sequence subscriber ${err}`, 'error')
                })
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to fetch sequence messages ${err}`, 'error')
            })
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch subscriber ${err}`, 'error')
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch page ${err}`, 'error')
    })
}
