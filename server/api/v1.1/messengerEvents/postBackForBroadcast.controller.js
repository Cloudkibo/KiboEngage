const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/postBackForBroadcast.controller.js'
const {callApi} = require('../utility')
const SequencesDataLayer = require('../sequenceMessaging/sequence.datalayer')
const SequenceMessageQueueDataLayer = require('../sequenceMessageQueue/sequenceMessageQueue.datalayer')

exports.postBackForBroadcast = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  for (let i = 0; i < req.body.entry[0].messaging.length; i++) {
    const event = req.body.entry[0].messaging[i]
    let resp = JSON.parse(event.postback.payload)
    if (resp.action === 'subscribe') {
      subscribeToSequence(resp.sequenceId, event)
    } else if (resp.action === 'unsubscribe') {
      unsubscribeFromSequence(resp.sequenceId, event)
    }
  }
}
function unsubscribeFromSequence (sequenceId, req) {
  SequencesDataLayer.genericFindForSequence({ _id: sequenceId })
    .then(sequence => {
      sequence = sequence[0]
      callApi(`subscribers/query`, 'post', { senderId: req.sender.id, companyId: sequence.companyId, completeInfo: true })
        .then(subscribers => {
          let subscriber = subscribers[0]
          SequencesDataLayer.removeForSequenceSubscribers({ sequenceId: sequenceId }, subscriber._id)
            .then(updated => {
              SequenceMessageQueueDataLayer.deleteMany({ sequenceId: sequenceId, subscriberId: subscriber._id })
                .then(result => {
                  require('./../../../config/socketio').sendMessageToClient({
                    room_id: sequence.companyId,
                    body: {
                      action: 'sequence_update',
                      payload: {
                        sequence_id: sequenceId
                      }
                    }
                  })
                })
                .catch(err => {
                  const message = err || 'Failed to delete SequenceMessageQueue'
                  logger.serverLog(message, `${TAG}: unsubscribeFromSequence`, {sequenceId}, {user: req.user}, 'error')
                })
            })
            .catch(err => {
              const message = err || 'Failed to remove sequence subscriber'
              logger.serverLog(message, `${TAG}: unsubscribeFromSequence`, {sequenceId}, {user: req.user}, 'error')
            })
        })
        .catch(err => {
          const message = err || 'Failed to fetch subscriber'
          logger.serverLog(message, `${TAG}: unsubscribeFromSequence`, {sequenceId}, {user: req.user}, 'error')
        })
    })
    .catch(err => {
      const message = err || 'Failed to fetch sequence'
      logger.serverLog(message, `${TAG}: unsubscribeFromSequence`, {sequenceId}, {user: req.user}, 'error')
    })
}
function subscribeToSequence (sequenceId, req) {
  SequencesDataLayer.genericFindForSequence({ _id: sequenceId })
    .then(sequence => {
      sequence = sequence[0]
      callApi(`subscribers/query`, 'post', { senderId: req.sender.id, companyId: sequence.companyId, completeInfo: true })
        .then(subscriber => {
          subscriber = subscriber[0]
          SequencesDataLayer.genericFindForSequenceSubscribers({ subscriberId: subscriber._id })
            .then(sequenceSubscriber => {
              // CASE-1 Subscriber already exists
              if (sequenceSubscriber && sequenceSubscriber.length > 0 && sequenceSubscriber !== {} && sequenceSubscriber !== null) {
                sequenceSubscriber = sequenceSubscriber[0]
                SequencesDataLayer.genericUpdateForSequenceSubscribers({ _id: sequenceSubscriber._id }, { status: 'subscribed' }, {})
                  .then(updated => {})
                  .catch(err => {
                    const message = err || 'Failed to update sequence subscriber'
                    logger.serverLog(message, `${TAG}: subscribeToSequence`, {sequenceId}, {}, 'error')
                  })
                  // CASE-2 Subscriber doesn't exist
              } else {
                SequencesDataLayer.genericFindForSequenceMessages({ sequenceId: sequenceId })
                  .then(messages => {
                    messages.forEach(message => {
                      if (message.schedule.condition === 'immediately') {
                      } else {
                        let sequenceQueuePayload = {
                          sequenceId: sequenceId,
                          subscriberId: subscriber._id,
                          companyId: subscriber.companyId,
                          sequenceMessageId: message._id,
                          queueScheduledTime: message.schedule.date, // Needs to be updated after #3704
                          isActive: message.isActive
                        }

                        SequenceMessageQueueDataLayer.create(sequenceQueuePayload)
                          .then(messageQueueCreated => {}) //  save ends here
                          .catch(err => {
                            const message = err || 'Failed to create sequence queue'
                            logger.serverLog(message, `${TAG}: subscribeToSequence`, {sequenceId}, {}, 'error')
                          })
                      } // else ends here
                    }) // Messages Foreach ends here
                    let sequenceSubscriberPayload = {
                      sequenceId: sequenceId,
                      subscriberId: subscriber._id,
                      companyId: sequence.companyId,
                      status: 'subscribed'
                    }
                    SequencesDataLayer.createForSequenceSubcriber(sequenceSubscriberPayload)
                      .then(subscriberCreated => {
                        require('./../../../config/socketio').sendMessageToClient({
                          room_id: sequence.companyId,
                          body: {
                            action: 'sequence_update',
                            payload: {
                              sequence_id: sequenceId
                            }
                          }
                        })
                      })
                      .catch(err => {
                        const message = err || 'Failed to create sequence subscriber'
                        logger.serverLog(message, `${TAG}: subscribeToSequence`, {sequenceId}, {user: req.user}, 'error')
                      })
                  })
                  .catch(err => {
                    const message = err || 'Failed to fetch sequence messages'
                    logger.serverLog(message, `${TAG}: subscribeToSequence`, {sequenceId}, {user: req.user}, 'error')
                  })
              }
            })
            .catch(err => {
              const message = err || 'Failed to fetch sequence subscriber'
              logger.serverLog(message, `${TAG}: subscribeToSequence`, {sequenceId}, {user: req.user}, 'error')
            })
        })
        .catch(err => {
          const message = err || 'Failed to fetch subscriber'
          logger.serverLog(message, `${TAG}: subscribeToSequence`, {sequenceId}, {user: req.user}, 'error')
        })
    })
    .catch(err => {
      const message = err || 'Failed to fetch sequence'
      logger.serverLog(message, `${TAG}: subscribeToSequence`, {sequenceId}, {user: req.user}, 'error')
    })
}
