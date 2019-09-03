const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/sequence.controller'
const SequenceUtility = require('../sequenceMessaging/utility')
const SequencesDataLayer = require('../sequenceMessaging/sequence.datalayer')

exports.index = function (req, res) {
  logger.serverLog(TAG, `in sequence ${JSON.stringify(req.body)}`)
  return res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
}

exports.subscriberJoins = function (req, res) {
  logger.serverLog(TAG, `in sequence subscriberJoins ${JSON.stringify(req.body)}`, 'debug')

  callApi(`subscribers/query`, 'post', {senderId: req.body.senderId, pageId: req.body.pageId})
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
                          let utcDate = SequenceUtility.setScheduleDate(message.schedule)
                          SequenceUtility.addToMessageQueue(seq._id, message._id, subscriber._id, subscriber.companyId, utcDate)
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

exports.respondsToPoll = function (data) {
  logger.serverLog(TAG, `in sequence resposndsToPoll ${JSON.stringify(data)}`, 'debug')

  SequencesDataLayer.genericFindForSequence({companyId: data.companyId, 'trigger.event': 'responds_to_poll', 'trigger.value': data.pollId})
    .then(sequences => {
      if (sequences.length > 0) {
        sequences.forEach(seq => {
          SequencesDataLayer.genericFindForSequenceMessages({sequenceId: seq._id})
            .then(messages => {
              if (messages.length > 0) {
                let sequenceSubscriberPayload = {
                  sequenceId: seq._id,
                  subscriberId: data.subscriberId,
                  companyId: data.companyId,
                  status: 'subscribed'
                }
                SequencesDataLayer.createForSequenceSubcriber(sequenceSubscriberPayload)
                  .then(subscriberCreated => {
                    messages.forEach(message => {
                      let utcDate = SequenceUtility.setScheduleDate(message.schedule)
                      SequenceUtility.addToMessageQueue(seq._id, message._id, data.subscriberId, data.companyId, utcDate)
                    })
                    require('./../../../config/socketio').sendMessageToClient({
                      room_id: data.companyId,
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
}
