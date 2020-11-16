const TAG = 'api/v1.1/messengerEvents/delivery.controller'
const BroadcastPageDataLayer = require('../page_broadcast/page_broadcast.datalayer')
const PollPageDataLayer = require('../page_poll/page_poll.datalayer')
const SurveyPageDataLayer = require('../page_survey/page_survey.datalayer')
const logger = require('../../../components/logger')
const SequenceUtility = require('../sequenceMessaging/utility')
const SequencesDataLayer = require('../sequenceMessaging/sequence.datalayer')
const SequenceMessageQueueDataLayer = require('../sequenceMessageQueue/sequenceMessageQueue.datalayer')
const RssFeedPostSubscribersDataLayer = require('../newsSections/newsPostSubscribers.datalayer')
const utility = require('../utility')
const async = require('async')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let data = {
    recipientId: req.body.entry[0].messaging[0].recipient.id,
    senderId: req.body.entry[0].messaging[0].sender.id,
    delivery: req.body.entry[0].messaging[0].delivery
  }
  async.parallelLimit([
    _updateBroadcastSent.bind(null, data),
    _updatePollSent.bind(null, data),
    _updateSurveySent.bind(null, data),
    _updateSequenceSubscriberMessage.bind(null, data),
    _updateRssFeedSent.bind(null, data)
  ], 10, function (err) {
    if (err) {
      const message = err || 'Error at delivery controller'
      logger.serverLog(message, `${TAG}: saveCustomFieldValue`, req.body, {user: req.user}, 'error')
    }
  })
}

function _updateBroadcastSent (data, next) {
  BroadcastPageDataLayer.genericUpdate({ pageId: data.recipientId, subscriberId: data.senderId, sent: false }, { sent: true }, { multi: true })
    .then(updated => {
      next(null)
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _updateBroadcastSent`, data, {}, 'error')
      next(err)
    })
}

function _updatePollSent (data, next) {
  PollPageDataLayer.genericFind({ pageId: data.recipientId, subscriberId: data.senderId, sent: false })
    .then(pollPages => {
      PollPageDataLayer.genericUpdate({ pageId: data.recipientId, subscriberId: data.senderId, sent: false }, { sent: true }, { multi: true })
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
          logger.serverLog(message, `${TAG}: _updatePollSent`, data, {}, 'error')
          next(err)
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _updatePollSent`, data, {}, 'error')
      next(err)
    })
}

function _updateSurveySent (data, next) {
  SurveyPageDataLayer.genericFind({ pageId: data.recipientId, subscriberId: data.senderId, sent: false })
    .then(surveyPages => {
      SurveyPageDataLayer.genericUpdate({ pageId: data.recipientId, subscriberId: data.senderId, sent: false }, { sent: true }, { multi: true })
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
          logger.serverLog(message, `${TAG}: _updateSurveySent`, data, {}, 'error')
          next(err)
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _updateSurveySent`, data, {}, 'error')
      next(err)
    })
}

function _updateSequenceSubscriberMessage (data, next) {
  utility.callApi(`pages/query`, 'post', {pageId: data.recipientId, connected: true})
    .then(pages => {
      const page = pages[0]
      if (page) {
        utility.callApi(`subscribers/query`, 'post', { senderId: data.senderId, companyId: page.companyId, completeInfo: true })
          .then(subscribers => {
            const subscriber = subscribers[0]
            if (subscriber) {
              SequencesDataLayer.genericFindForSubscriberMessages({subscriberId: subscriber._id, received: false, datetime: { $lte: new Date(data.delivery.watermark) }})
                .then(seqSubMsg => {
                  SequencesDataLayer.genericUpdateForSubscriberMessages({subscriberId: subscriber._id, received: false, datetime: { $lte: new Date(data.delivery.watermark) }},
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
                                      next(null)
                                    })
                                    .catch(err => {
                                      const message = err || 'Internal Server Error'
                                      logger.serverLog(message, `${TAG}: _updateSequenceSubscriberMessage`, data, {}, 'error')
                                      next(err)
                                    })
                                }
                              }
                            }
                          })
                          .catch(err => {
                            const message = err || 'Internal Server Error'
                            logger.serverLog(message, `${TAG}: _updateSequenceSubscriberMessage`, data, {}, 'error')
                            next(err)
                          })
                      }
                    })
                    .catch(err => {
                      const message = err || 'Internal Server Error'
                      logger.serverLog(message, `${TAG}: _updateSequenceSubscriberMessage`, data, {}, 'error')
                      next(err)
                    })
                })
                .catch(err => {
                  const message = err || 'Internal Server Error'
                  logger.serverLog(message, `${TAG}: _updateSequenceSubscriberMessage`, data, {}, 'error')
                  next(err)
                })
            }
          })
          .catch(err => {
            const message = err || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: _updateSequenceSubscriberMessage`, data, {}, 'error')
            next(err)
          })
      }
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _updateSequenceSubscriberMessage`, data, {}, 'error')
      next(err)
    })
}
function _updateRssFeedSent (data, next) {
  utility.callApi(`pages/query`, 'post', {pageId: data.recipientId, connected: true})
    .then(pages => {
      const page = pages[0]
      if (page) {
        utility.callApi(`subscribers/query`, 'post', { pageId: page._id, senderId: data.senderId, companyId: page.companyId, completeInfo: true })
          .then(subscribers => {
            const subscriber = subscribers[0]
            if (subscriber) {
              RssFeedPostSubscribersDataLayer.genericUpdate({ pageId: page._id, subscriberId: subscriber._id, sent: false }, {sent: true}, { multi: true })
                .then(updated => {
                  next(null)
                })
                .catch(err => {
                  const message = err || 'Internal Server Error'
                  logger.serverLog(message, `${TAG}: _updateRssFeedSent`, data, {}, 'error')
                  next(err)
                })
            }
          })
          .catch(err => {
            const message = err || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: _updateRssFeedSent`, data, {}, 'error')
            next(err)
          })
      }
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _updateRssFeedSent`, data, {}, 'error')
      next(err)
    })
}
