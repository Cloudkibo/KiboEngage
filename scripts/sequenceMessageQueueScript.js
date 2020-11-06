const utility = require('../server/api/v1.1/utility')
const logger = require('../server/components/logger')
const SequenceMessagesQueueDataLayer = require('../server/api/v1.1/sequenceMessageQueue/sequenceMessageQueue.datalayer')
const SequenceDataLayer = require('../server/api/v1.1/sequenceMessaging/sequence.datalayer')
const BroadcastUtility = require('../server/api/v1.1/broadcasts/broadcasts.utility')
const LogicLayer = require('./logiclayer')
const TAG = 'scripts/SequenceMessageQueueScript.js'
const request = require('request')

exports.runSequenceMessageQueueScript = function () {
  SequenceMessagesQueueDataLayer.findAll()
    .then(data => {
      if (data) {
        for (let i = 0; i < data.length; i++) {
          let message = data[i]
          if (message.queueScheduledTime && new Date(message.queueScheduledTime).getTime() < new Date().getTime()) {
            SequenceDataLayer.genericFindForSequence({ _id: message.sequenceId })
              .then(sequence => {
                sequence = sequence[0]
                let sequenceMessage = message.sequenceMessageId
                if (sequenceMessage.trigger.event === 'none') {
                  sendSequenceMessage(message, sequence, sequenceMessage)
                } else if (sequenceMessage.trigger.event === 'sees') {
                  SequenceDataLayer.genericFindForSubscriberMessages({ messageId: sequenceMessage.trigger.value, subscriberId: message.subscriberId })
                    .then(seenMessage => {
                      seenMessage = seenMessage[0]
                      if (seenMessage.seen) {
                        sendSequenceMessage(message, sequence, sequenceMessage)
                      }
                    })
                    .catch(err => {
                      const message = err || 'Failed to fetch sequence subscriber message - sees trigger'
                      logger.serverLog(message, `${TAG}: runSequenceMessageQueueScript`, data, {}, 'error')
                    })
                } else if (sequenceMessage.trigger.event === 'clicks') {
                  sendSequenceMessage(message, sequence, sequenceMessage)
                } else if (sequenceMessage.trigger.event === 'receives') {
                  SequenceDataLayer.genericFindForSubscriberMessages({ messageId: sequenceMessage.trigger.value, subscriberId: message.subscriberId })
                    .then(receivedMessage => {
                      receivedMessage = receivedMessage[0]
                      if (receivedMessage.received) {
                        sendSequenceMessage(message, sequence, sequenceMessage)
                      }
                    })
                    .catch(err => {
                      const message = err || 'Failed to fetch sequence subscriber message - sees trigger'
                      logger.serverLog(message, `${TAG}: runSequenceMessageQueueScript`, data, {}, 'error')
                    })
                }
              }) // Sequence Find ends here
              .catch(err => {
                const message = err || 'Failed to fetch sequence'
                logger.serverLog(message, `${TAG}: runSequenceMessageQueueScript`, data, {}, 'error')
              })
          }
        } // For loop ends here
      } // If data clause check
    }) // Quence find ends here
    .catch(err => {
      const message = err || 'Failed to fetch SequenceMessagesQueue'
      logger.serverLog(message, `${TAG}: runSequenceMessageQueueScript`, {}, {}, 'error')
    })
}

function sendSequenceMessage (message, sequence, sequenceMessage) {
  utility.callApi(`subscribers/${message.subscriberId}`)
    .then(subscriber => {
      utility.callApi(`companyUser/query`, 'post', { 'companyId': message.companyId })
        .then(companyUser => {
          let page = subscriber.pageId
          SequenceDataLayer.genericFindForSequenceSubscribers({subscriberId: subscriber._id, sequenceId: sequence.id})
            .then(seqSub => {
              seqSub = seqSub[0]
              utility.callApi(`tags/query`, 'post', {companyId: companyUser.companyId})
                .then(tags => {
                  let newPayload = sequenceMessage.payload
                  let sequenceSubMessagePayload = {
                    subscriberId: subscriber._id,
                    messageId: sequenceMessage._id,
                    companyId: companyUser.companyId,
                    datetime: new Date(),
                    seen: false
                  }
                  // Below work is to check segmentation
                  if (sequenceMessage.segmentation.length > 0) {
                    let tempSegmentCondition = sequenceMessage.segmentationCondition
                    let temp = LogicLayer.getValue(sequenceMessage, subscriber, tags, page, seqSub)
                    let tempFlag = temp.tempFlag
                    let tempSegment = temp.tempSegment
                    // Send message if all of the conditions matched
                    if (tempSegmentCondition === 'and') {
                      if (tempFlag === tempSegment.length) {
                        SequenceDataLayer.createForSequenceSubscribersMessages(sequenceSubMessagePayload)
                          .then(result => {
                            SequenceDataLayer.genericUpdateForSequenceMessages({_id: sequenceMessage._id}, {$inc: {sent: 1}}, {multi: true})
                              .then(updated => {})
                              .catch(err => {
                                const message = err || 'Failed to update sequenceMessage'
                                logger.serverLog(message, `${TAG}: sendSequenceMessage`, message, {}, 'error')
                              })
                            let fbMessageTag = 'NON_PROMOTIONAL_SUBSCRIPTION'
                            BroadcastUtility.getBatchData(newPayload, subscriber.senderId, page, sendBroadcast, subscriber.firstName, subscriber.lastName, '', '', '', fbMessageTag)
                            SequenceMessagesQueueDataLayer.deleteOneObject(message._id)
                              .then(result => {})
                              .catch(err => {
                                const message = err || 'Failed to delete sequenceMessageQueue'
                                logger.serverLog(message, `${TAG}: sendSequenceMessage`, message, {}, 'error')
                              })
                          })
                          .catch(err => {
                            const message = err || 'Failed to create SequenceSubscribersMessage'
                            logger.serverLog(message, `${TAG}: sendSequenceMessage`, message, {}, 'error')
                          })
                      }
                    } else if (tempSegmentCondition === 'or') {
                      // Send messages if any one of the condition matched.
                      if (tempFlag > 0) {
                        SequenceDataLayer.createForSequenceSubscribersMessages(sequenceSubMessagePayload)
                          .then(result => {
                            SequenceDataLayer.genericUpdateForSequenceMessages({_id: sequenceMessage._id}, {$inc: {sent: 1}}, {multi: true})
                              .then(updated => {})
                              .catch(err => {
                                const message = err || 'Failed to update sequenceMessage'
                                logger.serverLog(message, `${TAG}: sendSequenceMessage`, message, {}, 'error')
                              })
                            let fbMessageTag = 'NON_PROMOTIONAL_SUBSCRIPTION'
                            BroadcastUtility.getBatchData(newPayload, subscriber.senderId, page, sendBroadcast, subscriber.firstName, subscriber.lastName, '', '', '', fbMessageTag)
                            SequenceMessagesQueueDataLayer.deleteOneObject(message._id)
                              .then(result => {})
                              .catch(err => {
                                const message = err || 'Failed to delete sequenceMessageQueue'
                                logger.serverLog(message, `${TAG}: sendSequenceMessage`, message, {}, 'error')
                              })
                          })
                          .catch(err => {
                            const message = err || 'Failed to create SequenceSubscribersMessage'
                            logger.serverLog(message, `${TAG}: sendSequenceMessage`, message, {}, 'error')
                          })
                      }
                    }
                  } else { // No segmentation
                    SequenceDataLayer.createForSequenceSubscribersMessages(sequenceSubMessagePayload)
                      .then(result => {
                        SequenceDataLayer.genericUpdateForSequenceMessages({_id: sequenceMessage._id}, {$inc: {sent: 1}}, {multi: true})
                          .then(updated => {})
                          .catch(err => {
                            const message = err || 'Failed to update sequenceMessage'
                            logger.serverLog(message, `${TAG}: sendSequenceMessage`, message, {}, 'error')
                          })
                        let fbMessageTag = 'NON_PROMOTIONAL_SUBSCRIPTION'
                        BroadcastUtility.getBatchData(newPayload, subscriber.senderId, page, sendBroadcast, subscriber.firstName, subscriber.lastName, '', '', '', fbMessageTag)
                        SequenceMessagesQueueDataLayer.deleteOneObject(message._id)
                          .then(result => {})
                          .catch(err => {
                            const message = err || 'Failed to delete sequenceMessageQueue'
                            logger.serverLog(message, `${TAG}: sendSequenceMessage`, message, {}, 'error')
                          })
                      })
                      .catch(err => {
                        const message = err || 'Failed to create SequenceSubscribersMessage '
                        logger.serverLog(message, `${TAG}: sendSequenceMessage`, message, {}, 'error')
                      })
                  }
                }) // Tags find ends here
                .catch(err => {
                  const message = err || 'Failed to fetch tags'
                  logger.serverLog(message, `${TAG}: sendSequenceMessage`, message, {}, 'error')
                })
            }) // Sequence Subscriber find ends here
            .catch(err => {
              const message = err || 'Failed to fetch sequence subscriber'
              logger.serverLog(message, `${TAG}: sendSequenceMessage`, message, {}, 'error')
            })
        }) // Company find ends here
        .catch(err => {
          const message = err || 'Failed to fetch companyUser'
          logger.serverLog(message, `${TAG}: sendSequenceMessage`, message, {}, 'error')
        })
    }) // Subscriber find ends here
    .catch(err => {
      const message = err || 'Failed to fetch subscriber'
      logger.serverLog(message, `${TAG}: sendSequenceMessage`, message, {}, 'error')
    })
}

const sendBroadcast = (batchMessages, page) => {
  const r = request.post('https://graph.facebook.com', (err, httpResponse, response) => {
    if (err) {
      const message = err || 'Batch send error'
      return logger.serverLog(message, `${TAG}: sendBroadcast`, message, {}, 'error')
    }
  })
  const form = r.form()
  form.append('access_token', page.accessToken)
  form.append('batch', batchMessages)
}
