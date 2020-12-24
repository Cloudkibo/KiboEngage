const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/seen.controller'
const SequenceUtility = require('../sequenceMessaging/utility')
const BroadcastPageDataLayer = require('../page_broadcast/page_broadcast.datalayer')
const PollPageDataLayer = require('../page_poll/page_poll.datalayer')
const SurveyPageDataLayer = require('../page_survey/page_survey.datalayer')
const SequencesDataLayer = require('../sequenceMessaging/sequence.datalayer')
const SequenceMessageQueueDataLayer = require('../sequenceMessageQueue/sequenceMessageQueue.datalayer')
const RssFeedPostSubscribersDataLayer = require('../newsSections/newsPostSubscribers.datalayer')
const async = require('async')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let data = req.body.entry[0].messaging[0]
  async.parallelLimit([
    _updateBroadcastSeen.bind(null, data),
    _updatePollSeen.bind(null, data),
    _updateSurveySeen.bind(null, data),
    _updateRssFeedSeen.bind(null, data),
    _updateSequenceSeen.bind(null, data)
  ], 10, function (err) {
    if (err) {
      const message = err || 'ERROR at seen controller'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
    }
  })
}

function _updateBroadcastSeen (data, next) {
  BroadcastPageDataLayer.genericUpdate({ pageId: data.recipient.id, subscriberId: data.sender.id, seen: false }, { seen: true }, { multi: true })
    .then(updated => {
      next(null)
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _updateBroadcastSeen`, data, {}, 'error')
      next(err)
    })
}

function _updatePollSeen (data, next) {
  PollPageDataLayer.genericFind({ pageId: data.recipient.id, subscriberId: data.sender.id, seen: false })
    .then(pollPages => {
      PollPageDataLayer.genericUpdate({ pageId: data.recipient.id, subscriberId: data.sender.id, seen: false }, { seen: true }, { multi: true })
        .then(updated => {
          if (pollPages.length > 0) {
            require('./../../../config/socketio').sendMessageToClient({
              room_id: pollPages[0].companyId,
              body: {
                action: 'poll_send'
              }
            })
          }
          next(null)
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: _updatePollSeen`, data, {}, 'error')
          next(err)
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _updatePollSeen`, data, {}, 'error')
      next(err)
    })
}

function _updateSurveySeen (data, next) {
  SurveyPageDataLayer.genericFind({ pageId: data.recipient.id, subscriberId: data.sender.id, seen: false })
    .then(surveyPages => {
      SurveyPageDataLayer.genericUpdate({ pageId: data.recipient.id, subscriberId: data.sender.id, seen: false }, { seen: true }, { multi: true })
        .then(updated => {
          if (surveyPages.length > 0) {
            require('./../../../config/socketio').sendMessageToClient({
              room_id: surveyPages[0].companyId,
              body: {
                action: 'survey_send'
              }
            })
          }
          next(null)
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: _updateSurveySeen`, data, {}, 'error')
          next(err)
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _updateSurveySeen`, data, {}, 'error')
      next(err)
    })
}

function _updateSequenceSeen (data, next) {
  utility.callApi(`pages/query`, 'post', {pageId: data.recipient.id, connected: true})
    .then(pages => {
      const page = pages[0]
      if (page) {
        utility.callApi(`subscribers/query`, 'post', { senderId: data.sender.id, companyId: page.companyId, completeInfo: true })
          .then(subscribers => {
            const subscriber = subscribers[0]
            if (subscriber) {
              SequencesDataLayer.genericFindForSubscriberMessages({subscriberId: subscriber._id, seen: false, datetime: { $lte: new Date(data.read.watermark) }})
                .then(seqSubMsg => {
                  if (seqSubMsg.length > 0) {
                    SequencesDataLayer.genericUpdateForSubscriberMessages({subscriberId: subscriber._id, seen: false, datetime: { $lte: new Date(data.read.watermark) }},
                      { seen: true }, { multi: true })
                      .then(updated => {
                        SequencesDataLayer.genericUpdateForSequenceMessages({_id: seqSubMsg[0].messageId}, {$inc: { seen: 1 }}, {})
                          .then(updated => {
                            for (let k = 0; k < seqSubMsg.length; k++) {
                              // check queue for trigger - sees the message
                              SequenceMessageQueueDataLayer.genericFind({ subscriberId: subscriber._id, companyId: subscriber.companyId })
                                .then(seqQueue => {
                                  if (seqQueue.length > 0) {
                                    for (let i = 0; i < seqQueue.length; i++) {
                                      if (seqQueue[i].sequenceMessageId.trigger.event === 'sees' && seqQueue[i].sequenceMessageId.trigger.value === seqSubMsg[k].messageId) {
                                        let utcDate = SequenceUtility.setScheduleDate(seqQueue[i].sequenceMessageId.schedule)
                                        SequenceMessageQueueDataLayer.genericUpdate({_id: seqQueue[i]._id}, {queueScheduledTime: utcDate}, {})
                                          .then(updated => {
                                          })
                                          .catch(err => {
                                            const message = err || 'Internal Server Error'
                                            logger.serverLog(message, `${TAG}: _updateSequenceSeen`, data, {}, 'error')
                                          })
                                      }
                                    }
                                  }
                                })
                                .catch(err => {
                                  const message = err || 'Internal Server Error'
                                  logger.serverLog(message, `${TAG}: _updateSequenceSeen`, data, {}, 'error')
                                })
                            }
                            next()
                          })
                          .catch(err => {
                            const message = err || 'Internal Server Error'
                            logger.serverLog(message, `${TAG}: _updateSequenceSeen`, data, {}, 'error')
                            next(err)
                          })
                      })
                      .catch(err => {
                        const message = err || 'Internal Server Error'
                        logger.serverLog(message, `${TAG}: _updateSequenceSeen`, data, {}, 'error')
                        next(err)
                      })
                  }
                })
                // work for seen_all_sequence_messages trigger
                // let query = {
                //   purpose: 'aggregate',
                //   match: {seen: true, companyId: page.companyId},
                //   group: {_id: '$messageId', count: {$sum: 1}}
                // }
                // utility.callApi(`sequence_subscribers/message`, 'put', query, 'kiboengage')
                //   .then(messagesSeenCounts => {
                //     messagesSeenCounts.forEach((message) => {
                //       SequencesDataLayer.genericUpdateForSequenceMessages({ _id: message._id }, { seen: message.count }, {multi: true})
                //         .then(updated => {
                //           TriggerSeenAllSequenceMessages(subscriber)
                //         })
                //         .catch()
                //     })
                //   })
                .catch(err => {
                  const message = err || 'Internal Server Error'
                  logger.serverLog(message, `${TAG}: _updateSequenceSeen`, data, {}, 'error')
                  next(err)
                })
            }
          })
          .catch(err => {
            const message = err || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: _updateSequenceSeen`, data, {}, 'error')
            next(err)
          })
      }
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _updateSequenceSeen`, data, {}, 'error')
      next(err)
    })
}

// function TriggerSeenAllSequenceMessages (subscriber) {
//   SequencesDataLayer.genericFindForSequenceSubscribers({ subscriberId: subscriber._id })
//     .then(seqsubs => {
//       if (seqsubs.length > 0) {
//         seqsubs.forEach(seqsub => {
//           SequencesDataLayer.genericFindForSequence({_id: seqsub.sequenceId, 'trigger.event': 'seen_all_sequence_messages'})
//             .then(sequences => {
//               let sequence = sequences[0]
//               if (sequence) {
//                 SequencesDataLayer.genericFindForSequenceMessages({sequenceId: sequence.trigger.value})
//                   .then(messages => {
//                     const messagesCount = messages.length
//                     let seenCount = 0
//                     if (messages.length > 0) {
//                       messages.forEach((message, index) => {
//                         SequencesDataLayer.genericFindForSubscriberMessages({subscriberId: subscriber._id, messageId: message._id, seen: true})
//                           .then(submsgs => {
//                             if (submsgs.length > 0) {
//                               seenCount++
//                             }
//                             if (index === messagesCount - 1 && seenCount === messagesCount) {
//                               // trigger
//                               SequencesDataLayer.genericFindForSequenceMessages({sequenceId: sequence._id})
//                                 .then(messages => {
//                                   if (messages.length > 0) {
//                                     let sequenceSubscriberPayload = {
//                                       sequenceId: sequence._id,
//                                       subscriberId: subscriber._id,
//                                       companyId: subscriber.companyId,
//                                       status: 'subscribed'
//                                     }
//                                     SequencesDataLayer.createForSequenceSubcriber(sequenceSubscriberPayload)
//                                       .then(subscriberCreated => {
//                                         messages.forEach(message => {
//                                           let utcDate = SequenceUtility.setScheduleDate(message.schedule)
//                                           SequenceUtility.addToMessageQueue(sequence._id, utcDate, message._id)
//                                         })
//                                         require('./../../../config/socketio').sendMessageToClient({
//                                           room_id: subscriber.companyId,
//                                           body: {
//                                             action: 'sequence_update',
//                                             payload: {
//                                               sequence_id: sequence._id
//                                             }
//                                           }
//                                         })
//                                       })
//                                       .catch()
//                                   }
//                                 })
//                                 .catch()
//                             }
//                           })
//                           .catch()
//                       })
//                     }
//                   })
//                   .catch()
//               }
//             })
//             .catch()
//         })
//       }
//     })
// }
function _updateRssFeedSeen (data, next) {
  utility.callApi(`pages/query`, 'post', {pageId: data.recipient.id, connected: true})
    .then(pages => {
      const page = pages[0]
      if (page) {
        utility.callApi(`subscribers/query`, 'post', { pageId: page._id, senderId: data.sender.id, companyId: page.companyId, completeInfo: true })
          .then(subscribers => {
            const subscriber = subscribers[0]
            if (subscriber) {
              RssFeedPostSubscribersDataLayer.genericUpdate({ pageId: page._id, subscriberId: subscriber._id, seen: false }, {seen: true}, { multi: true })
                .then(updated => {
                  next(null)
                })
                .catch(err => {
                  const message = err || 'Internal Server Error'
                  logger.serverLog(message, `${TAG}: _updateRssFeedSeen`, data, {}, 'error')
                  next(err)
                })
            }
          })
          .catch(err => {
            const message = err || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: _updateRssFeedSeen`, data, {}, 'error')
            next(err)
          })
      }
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _updateRssFeedSeen`, data, {}, 'error')
      next(err)
    })
}
