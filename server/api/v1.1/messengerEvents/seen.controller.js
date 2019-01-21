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
  console.log('in seen', JSON.stringify(req.body))
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
  utility.callApi(`pages/query`, 'post', {pageId: req.recipient.id, connected: true})
    .then(pages => {
      const page = pages[0]
      if (page) {
        utility.callApi(`subscribers/query`, 'post', { senderId: req.sender.id, companyId: page.companyId })
          .then(subscribers => {
            const subscriber = subscribers[0]
            if (subscriber) {
              logger.serverLog('DateTime', `${JSON.stringify(new Date(req.read.watermark))}`)
              SequencesDataLayer.genericUpdateForSubscriberMessages({subscriberId: subscriber._id, seen: false, datetime: { $lte: new Date(req.read.watermark) }},
                { seen: true }, { multi: true })
                .then(updated => {
                  let query = {
                    purpose: 'aggregate',
                    match: {seen: true, companyId: page.companyId},
                    group: {_id: '$messageId', count: {$sum: 1}}
                  }
                  utility.callApi(`sequence_subscribers/message`, 'put', query, '', 'kiboengage')
                    .then(messagesSeenCounts => {
                      messagesSeenCounts.forEach((message) => {
                        SequencesDataLayer.genericUpdateForSequenceMessages({ _id: message._id }, { seen: message.count }, {multi: true})
                          .then(updated => {
                            TriggerSeenAllSequenceMessages(subscriber)
                          })
                          .catch()
                      })
                    })
                })
                .catch()
            }
          })
          .catch()
      }
    })
    .catch()
}

function TriggerSeenAllSequenceMessages (subscriber) {
  SequencesDataLayer.genericFindForSequenceSubscribers({ subscriberId: subscriber._id })
    .then(seqsubs => {
      if (seqsubs.length > 0) {
        seqsubs.forEach(seqsub => {
          SequencesDataLayer.genericFindForSequence({_id: seqsub.sequenceId, 'trigger.event': 'seen_all_sequence_messages'})
            .then(sequences => {
              let sequence = sequences[0]
              if (sequence) {
                SequencesDataLayer.genericFindForSequenceMessages({sequenceId: sequence.trigger.value})
                  .then(messages => {
                    const messagesCount = messages.length
                    let seenCount = 0
                    if (messages.length > 0) {
                      messages.forEach((message, index) => {
                        SequencesDataLayer.genericFindForSubscriberMessages({subscriberId: subscriber._id, messageId: message._id, seen: true})
                          .then(submsgs => {
                            if (submsgs.length > 0) {
                              seenCount++
                            }
                            if (index === messagesCount - 1 && seenCount === messagesCount) {
                              // trigger
                              SequencesDataLayer.genericFindForSequenceMessages({sequenceId: sequence._id})
                                .then(messages => {
                                  if (messages.length > 0) {
                                    let sequenceSubscriberPayload = {
                                      sequenceId: sequence._id,
                                      subscriberId: subscriber._id,
                                      companyId: subscriber.companyId,
                                      status: 'subscribed'
                                    }
                                    SequencesDataLayer.createForSequenceSubcriber(sequenceSubscriberPayload)
                                      .then(subscriberCreated => {
                                        messages.forEach(message => {
                                          let utcDate = SequenceUtility.setScheduleDate(message.schedule)
                                          SequenceUtility.addToMessageQueue(sequence._id, utcDate, message._id)
                                        })
                                        require('./../../../config/socketio').sendMessageToClient({
                                          room_id: subscriber.companyId,
                                          body: {
                                            action: 'sequence_update',
                                            payload: {
                                              sequence_id: sequence._id
                                            }
                                          }
                                        })
                                      })
                                      .catch()
                                  }
                                })
                                .catch()
                            }
                          })
                          .catch()
                      })
                    }
                  })
                  .catch()
              }
            })
            .catch()
        })
      }
    })
}
