const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/seen.controller'
const SequenceUtility = require('../sequenceMessaging/utility')
const BroadcastPageDataLayer = require('../page_broadcast/page_broadcast.datalayer')
const PollPageDataLayer = require('../page_poll/page_poll.datalayer')
const SurveyPageDataLayer = require('../page_survey/page_survey.datalayer')
const SequencesDataLayer = require('../sequenceMessaging/sequence.datalayer')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  logger.serverLog(TAG, `in seen ${JSON.stringify(req.body)}`)
  updateBroadcastSeen(req.body.entry[0].messaging[0])
  updatePollSeen(req.body.entry[0].messaging[0])
  updateSurveySeen(req.body.entry[0].messaging[0])
  updateSequenceSeen(req.body.entry[0].messaging[0])
}

function updateBroadcastSeen (req) {
  BroadcastPageDataLayer.genericUpdate({ pageId: req.recipient.id, subscriberId: req.sender.id, seen: false }, { seen: true }, { multi: true })
    .then(updated => {
      logger.serverLog(TAG, `Broadcast seen updated successfully`)
    })
    .catch(err => {
      logger.serverLog(TAG, `ERROR at updating broadcast seen ${JSON.stringify(err)}`)
    })
}

function updatePollSeen (req) {
  PollPageDataLayer.genericUpdate({ pageId: req.recipient.id, subscriberId: req.sender.id, seen: false }, { seen: true }, { multi: true })
    .then(updated => {
      logger.serverLog(TAG, `Poll seen updated successfully`)
    })
    .catch(err => {
      logger.serverLog(TAG, `ERROR at updating poll seen ${JSON.stringify(err)}`)
    })
}

function updateSurveySeen (req) {
  SurveyPageDataLayer.genericUpdate({ pageId: req.recipient.id, subscriberId: req.sender.id, seen: false }, { seen: true }, { multi: true })
    .then(updated => {
      logger.serverLog(TAG, `survey seen updated successfully`)
    })
    .catch(err => {
      logger.serverLog(TAG, `ERROR at updating survey seen ${JSON.stringify(err)}`)
    })
}

function updateSequenceSeen (req) {
  utility.callApi(`subscribers/query`, 'post', { senderId: req.sender.id })
    .then(subscriber => {
      if (subscriber) {
        subscriber = subscriber[0]
        SequencesDataLayer.distinctForSequenceSubscriberMessages('messageId', { subscriberId: subscriber._id, seen: false })
          .then(sequenceMessagesIds => {
            logger.serverLog('MessageIds', `${JSON.stringify(sequenceMessagesIds)}`)
            logger.serverLog('DateTime', `${JSON.stringify(new Date(req.read.watermark))}`)
            SequencesDataLayer.genericUpdateForSubscriberMessages({subscriberId: subscriber._id, seen: false, datetime: { $lte: new Date(req.read.watermark) }},
              { seen: true }, { multi: true })
              .then(updated => {
                sequenceMessagesIds.forEach((sequenceMessagesId, sIndex) => {
                  SequencesDataLayer.genericUpdateForSequenceMessages(
                    { _id: sequenceMessagesId },
                    { $inc: { seen: 1 } },
                    { multi: true }, (err, updated) => {
                      if (err) {
                        logger.serverLog(TAG, `ERROR ${JSON.stringify(err)}`)
                      }
                      // Logic to capture all seen messages for a sequence
                      let smIds = [] // Will contain the message ids against a specific sub AND sequnce
                      let length = sequenceMessagesIds.length - 1
                      // Checking if the last index and all seen have been inserted
                      if (sIndex === length) {
                        // Finding all the sequences of the subscriber
                        SequencesDataLayer.genericFindForSequenceSubscribers({ subscriberId: subscriber._id })
                          .then(seqsubs => {
                            if (seqsubs) {
                              seqsubs = seqsubs[0]
                              // Iterating for each sequence
                              seqsubs.forEach((seqSub) => {
                                // finding messages of all sequences one by one
                                SequencesDataLayer.genericFindForSequenceMessages({ sequenceId: seqSub.seqeunceId })
                                  .then(sequenceMessages => {
                                    // Inserting message ids against a specific subscriber and sequence
                                    for (let i = 0, length = sequenceMessages.length; i < length; i++) {
                                      smIds[i] = sequenceMessages[i]._id
                                    }
                                    // Finding all seen messages of that sequence
                                    SequencesDataLayer.gernicFetchForSequenceSubscriberMessages.find({ subscriberId: subscriber._id, seen: true, messageId: { $in: smIds } })
                                      .then(seqsubmessages => {
                                        // Checking if all the message of sequence have been seen
                                        if (sequenceMessages.length === seqsubmessages.length) {
                                          // It means that all of the messages of sequence have been seen
                                          // Now we need to see if this sequence is added in trigger of any other sequences
                                          SequencesDataLayer.genericFindForSequence({companyId: subscriber.companyId})
                                            .then(sequences => {
                                              if (sequences) {
                                                sequences.forEach(sequence => {
                                                  if (sequence.trigger && sequence.trigger.event) {
                                                    logger.serverLog(TAG, `seqSub ${JSON.stringify(seqSub)}`)
                                                    if (sequence.trigger.event === 'seen_all_sequence_messages' && (JSON.stringify(sequence.trigger.value) === JSON.stringify(seqSub.sequenceId))) {
                                                      SequencesDataLayer.genericFindForSequenceSubscribers({ subscriberId: subscriber._id, sequenceId: sequence._id })
                                                        .then(sequenceSubscriber => {
                                                          if (sequenceSubscriber.length < 1) {
                                                            logger.serverLog(TAG, `ERROR getting sequence ${JSON.stringify(seqSub.sequenceId)}`)
                                                            SequencesDataLayer.genericFindForSequenceMessages.find({ sequenceId: sequence._id })
                                                              .then(messages => {
                                                                SequencesDataLayer.createForSequenceSubcriber({sequenceId: sequence._id,
                                                                  subscriberId: subscriber._id,
                                                                  companyId: subscriber.companyId,
                                                                  status: 'subscribed'})
                                                                  .then(subscriberCreated => {
                                                                    logger.serverLog(TAG, `Subscribed to sequence successfully`)
                                                                    if (messages) {
                                                                      messages.forEach(message => {
                                                                        if (message.schedule.condition === 'immediately') {
                                                                          SequenceUtility.addToMessageQueue(sequence._id, new Date(), message._id)
                                                                        } else {
                                                                          let d1 = new Date()
                                                                          if (message.schedule.condition === 'hours') {
                                                                            d1.setHours(d1.getHours() + Number(message.schedule.days))
                                                                          } else if (message.schedule.condition === 'minutes') {
                                                                            d1.setMinutes(d1.getMinutes() + Number(message.schedule.days))
                                                                          } else if (message.schedule.condition === 'day(s)') {
                                                                            d1.setDate(d1.getDate() + Number(message.schedule.days))
                                                                          }
                                                                          let utcDate = new Date(d1)
                                                                          SequenceUtility.addToMessageQueue(sequence._id, utcDate, message._id)
                                                                        }
                                                                      })
                                                                    }
                                                                  })
                                                                  .catch(err => {
                                                                    logger.serverLog(TAG, `Failed to create sequencesubscriber ${JSON.stringify(err)}`)
                                                                  })
                                                              })
                                                              .catch(err => {
                                                                logger.serverLog(TAG, `Failed to fetch sequence messages ${JSON.stringify(err)}`)
                                                              })
                                                          }
                                                        })
                                                        .catch(err => {
                                                          logger.serverLog(TAG, `Failed to fetch sequenceSubscribers ${JSON.stringify(err)}`)
                                                        })
                                                    }
                                                  }
                                                })
                                              }
                                            })
                                            .catch(err => {
                                              logger.serverLog(TAG, `Failed to fetch sequences ${JSON.stringify(err)}`)
                                            })
                                        }
                                      }) // seqsubmessages find ends here
                                      .catch(err => {
                                        logger.serverLog(TAG, `Failed to fetch SequenceSubscriberMessages ${JSON.stringify(err)}`)
                                      })
                                  }) // sequence messages find ends here
                                  .catch(err => {
                                    logger.serverLog(TAG, `Failed to fetch Sequence Messages ${JSON.stringify(err)}`)
                                  })
                              }) // seqsubs Foreach ends here
                            }
                          }) // Sequence Subscriber find ends here
                          .catch(err => {
                            logger.serverLog(TAG, `Failed to fetch Sequence Subscriber ${JSON.stringify(err)}`)
                          })
                      }
                    }) // Sequence Message Update ends here
                    .catch(err => {
                      logger.serverLog(TAG, `Failed to update SequenceMessages ${JSON.stringify(err)}`)
                    })
                })
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to update SequenceSubscriberMessages ${JSON.stringify(err)}`)
              })
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to fetch sequenceMessagesIds ${JSON.stringify(err)}`)
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(err)}`)
    })
}
