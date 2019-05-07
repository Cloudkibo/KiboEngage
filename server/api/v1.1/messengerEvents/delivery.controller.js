const TAG = 'api/v1.1/messengerEvents/delivery.controller'
const BroadcastPageDataLayer = require('../page_broadcast/page_broadcast.datalayer')
const PollPageDataLayer = require('../page_poll/page_poll.datalayer')
const SurveyPageDataLayer = require('../page_survey/page_survey.datalayer')
const logger = require('../../../components/logger')
const SequenceUtility = require('../sequenceMessaging/utility')
const SequencesDataLayer = require('../sequenceMessaging/sequence.datalayer')
const SequenceMessageQueueDataLayer = require('../sequenceMessageQueue/sequenceMessageQueue.datalayer')
const utility = require('../utility')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  logger.serverLog(TAG, `in delivery' ${JSON.stringify(req.body)}`)
  updateBroadcastSent(req.body.entry[0].messaging[0])
  updatePollSent(req.body.entry[0].messaging[0])
  updateSurveySent(req.body.entry[0].messaging[0])
  updateSequenceSubscriberMessage(req.body.entry[0].messaging[0])
}

function updateBroadcastSent (req) {
  BroadcastPageDataLayer.genericUpdate({ pageId: req.recipient.id, subscriberId: req.sender.id, sent: false }, { sent: true }, { multi: true })
    .then(updated => {
      logger.serverLog(TAG, `Broadcast sent updated successfully`)
    })
    .catch(err => {
      logger.serverLog(TAG, `ERROR at updating broadcast sent ${JSON.stringify(err)}`)
    })
}

function updatePollSent (req) {
  PollPageDataLayer.genericFind({ pageId: req.recipient.id, subscriberId: req.sender.id, sent: false })
    .then(pollPages => {
      PollPageDataLayer.genericUpdate({ pageId: req.recipient.id, subscriberId: req.sender.id, sent: false }, { sent: true }, { multi: true })
        .then(updated => {
          logger.serverLog(TAG, `Poll sent updated successfully`)
          if (pollPages.length > 0) {
            require('./../../../config/socketio').sendMessageToClient({
              room_id: pollPages[0].companyId,
              body: {
                action: 'poll_send'
              }
            })
          }
        })
        .catch(err => {
          logger.serverLog(TAG, `ERROR at updating poll sent ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `ERROR in fetching poll pages ${JSON.stringify(err)}`)
    })
}

function updateSurveySent (req) {
  SurveyPageDataLayer.genericFind({ pageId: req.recipient.id, subscriberId: req.sender.id, sent: false })
    .then(surveyPages => {
      SurveyPageDataLayer.genericUpdate({ pageId: req.recipient.id, subscriberId: req.sender.id, sent: false }, { sent: true }, { multi: true })
        .then(updated => {
          logger.serverLog(TAG, `survey sent updated successfully`)
          if (surveyPages.length > 0) {
            require('./../../../config/socketio').sendMessageToClient({
              room_id: surveyPages[0].companyId,
              body: {
                action: 'survey_send'
              }
            })
          }
        })
        .catch(err => {
          logger.serverLog(TAG, `ERROR at updating survey sent ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `ERROR in fetching survey pages ${JSON.stringify(err)}`)
    })
}

function updateSequenceSubscriberMessage (req) {
  utility.callApi(`pages/query`, 'post', {pageId: req.recipient.id, connected: true})
    .then(pages => {
      const page = pages[0]
      if (page) {
        utility.callApi(`subscribers/query`, 'post', { senderId: req.sender.id, companyId: page.companyId })
          .then(subscribers => {
            const subscriber = subscribers[0]
            if (subscriber) {
              SequencesDataLayer.genericFindForSubscriberMessages({subscriberId: subscriber._id, received: false, datetime: { $lte: new Date(req.delivery.watermark) }})
                .then(seqSubMsg => {
                  logger.serverLog('DateTime', `${JSON.stringify(new Date(req.delivery.watermark))}`)
                  SequencesDataLayer.genericUpdateForSubscriberMessages({subscriberId: subscriber._id, received: false, datetime: { $lte: new Date(req.delivery.watermark) }},
                    { received: true }, { multi: true })
                    .then(updated => {
                      for (let k = 0; k < seqSubMsg.length; k++) {
                        // check queue for trigger - sees the message
                        SequenceMessageQueueDataLayer.genericFind({ subscriberId: subscriber._id, companyId: subscriber.companyId })
                          .then(seqQueue => {
                            if (seqQueue.length > 0) {
                              for (let i = 0; i < seqQueue.length; i++) {
                                if (seqQueue[i].sequenceMessageId.trigger.event === 'receives' && seqQueue[i].sequenceMessageId.trigger.value === seqSubMsg[k].messageId) {
                                  let utcDate = SequenceUtility.setScheduleDate(seqQueue[i].sequenceMessageId.schedule)
                                  SequenceMessageQueueDataLayer.genericUpdate({_id: seqQueue[i]._id}, {queueScheduledTime: utcDate}, {})
                                    .then(updated => {
                                      logger.serverLog(TAG, `queueScheduledTime updated successfully for record _id ${seqQueue[i]._id}`)
                                    })
                                    .catch(err => {
                                      logger.serverLog(TAG, `ERROR in updating sequence message queue ${JSON.stringify(err)}`)
                                    })
                                }
                              }
                            }
                          })
                          .catch(err => {
                            logger.serverLog(TAG, `ERROR in retrieving sequence message queue ${JSON.stringify(err)}`)
                          })
                      }
                    })
                    .catch(err => {
                      logger.serverLog(TAG, `ERROR in updating sequence subscriber messages ${JSON.stringify(err)}`)
                    })
                })
                .catch(err => {
                  logger.serverLog(TAG, `ERROR in retrieving sequence message queue ${JSON.stringify(err)}`)
                })
            }
          })
          .catch(err => {
            logger.serverLog(TAG, `ERROR in retrieving subscriber ${JSON.stringify(err)}`)
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `ERROR in retrieving page ${JSON.stringify(err)}`)
    })
}
