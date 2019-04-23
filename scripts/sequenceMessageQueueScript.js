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
      logger.serverLog(TAG, `Found sequenceMessageQueue objects ${data.length}`)
      if (data) {
        for (let i = 0; i < data.length; i++) {
          let message = data[i]
          if (new Date(message.queueScheduledTime).getTime() < new Date().getTime()) {
            logger.serverLog(TAG, `queueScheduledTime arrived for ${JSON.stringify(message)}`)
            SequenceDataLayer.genericFindForSequence({ _id: message.sequenceId })
              .then(sequence => {
                sequence = sequence[0]
                logger.serverLog(TAG, `sequence found ${JSON.stringify(sequence)}`)
                SequenceDataLayer.genericFindForSequenceMessages({ _id: message.sequenceMessageId })
                  .then(sequenceMessage => {
                    sequenceMessage = sequenceMessage[0]
                    logger.serverLog(TAG, `sequenceMessage found ${JSON.stringify(sequenceMessage)}`)
                    if (sequenceMessage.trigger.event === 'none') {
                      sendSequenceMessage(message, sequence, sequenceMessage)
                    } else if (sequenceMessage.trigger.event === 'sees') {
                      SequenceDataLayer.genericFindForSubscriberMessages({ messageId: sequenceMessage.trigger.value, subscriberId: message.subscriberId })
                        .then(seenMessage => {
                          if (seenMessage.seen) {
                            sendSequenceMessage(message, sequence, sequenceMessage)
                          }
                        })
                        .catch(err => {
                          logger.serverLog(TAG, `Failed to fetch sequence subscriber message - sees trigger ${JSON.stringify(err)}`)
                        })
                    } else if (sequenceMessage.trigger.event === 'clicks') {
                      SequenceDataLayer.genericFindForSubscriberMessages({ messageId: sequenceMessage.trigger.value, subscriberId: message.subscriberId })
                        .then(clickedMessage => {
                          if (clickedMessage.clicked && clickedMessage.clicked.status && clickedMessage.clicked.values.includes(sequenceMessage.trigger.buttonId)) {
                            sendSequenceMessage(message, sequence, sequenceMessage)
                          }
                        })
                        .catch(err => {
                          logger.serverLog(TAG, `Failed to fetch sequence subscriber message - sees trigger ${JSON.stringify(err)}`)
                        })
                    } else if (sequenceMessage.trigger.event === 'receives') {
                      SequenceDataLayer.genericFindForSubscriberMessages({ messageId: sequenceMessage.trigger.value, subscriberId: message.subscriberId })
                        .then(receivedMessage => {
                          if (receivedMessage.received) {
                            sendSequenceMessage(message, sequence, sequenceMessage)
                          }
                        })
                        .catch(err => {
                          logger.serverLog(TAG, `Failed to fetch sequence subscriber message - sees trigger ${JSON.stringify(err)}`)
                        })
                    }
                  })
                  .catch(err => {
                    logger.serverLog(TAG, `Failed to fetch sequence message ${JSON.stringify(err)}`)
                  })
              }) // Sequence Find ends here
              .catch(err => {
                logger.serverLog(TAG, `Failed to fetch sequence ${JSON.stringify(err)}`)
              })
          }
        } // For loop ends here
      } // If data clause check
    }) // Quence find ends here
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch SequenceMessagesQueue ${JSON.stringify(err)}`, 'error')
    })
}

function sendSequenceMessage (message, sequence, sequenceMessage) {
  utility.callApi(`subscribers/${message.subscriberId}`)
    .then(subscriber => {
      utility.callApi(`companyUser/query`, 'post', { 'companyId': message.companyId })
        .then(companyUser => {
          utility.callApi(`pages/${subscriber.pageId}`)
            .then(page => {
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
                            logger.serverLog(TAG, 'all conditions satisfied')
                            SequenceDataLayer.createForSequenceSubscribersMessages(sequenceSubMessagePayload)
                              .then(result => {
                                SequenceDataLayer.genericUpdateForSequenceMessages({_id: sequenceMessage._id}, {$inc: {sent: 1}}, {multi: true})
                                  .then(updated => {})
                                  .catch(err => {
                                    logger.serverLog(TAG, `Failed to update sequenceMessage ${JSON.stringify(err)}`)
                                  })
                                let fbMessageTag = 'NON_PROMOTIONAL_SUBSCRIPTION'
                                BroadcastUtility.getBatchData(newPayload, subscriber.senderId, page, sendBroadcast, subscriber.firstName, subscriber.lastName, '', '', '', fbMessageTag)
                                SequenceMessagesQueueDataLayer.deleteOneObject(message._id)
                                  .then(result => {})
                                  .catch(err => {
                                    logger.serverLog(TAG, `Failed to delete sequenceMessageQueue ${JSON.stringify(err)}`)
                                  })
                              })
                              .catch(err => {
                                logger.serverLog(TAG, `Failed to create SequenceSubscribersMessage ${JSON.stringify(err)}`)
                              })
                          } else {
                            logger.serverLog(TAG, 'All segmentation conditions are not satisfied')
                          }
                        } else if (tempSegmentCondition === 'or') {
                          // Send messages if any one of the condition matched.
                          if (tempFlag > 0) {
                            logger.serverLog(TAG, 'at least one condition satisfied')
                            SequenceDataLayer.createForSequenceSubscribersMessages(sequenceSubMessagePayload)
                              .then(result => {
                                SequenceDataLayer.genericUpdateForSequenceMessages({_id: sequenceMessage._id}, {$inc: {sent: 1}}, {multi: true})
                                  .then(updated => {})
                                  .catch(err => {
                                    logger.serverLog(TAG, `Failed to update sequenceMessage ${JSON.stringify(err)}`)
                                  })
                                let fbMessageTag = 'NON_PROMOTIONAL_SUBSCRIPTION'
                                BroadcastUtility.getBatchData(newPayload, subscriber.senderId, page, sendBroadcast, subscriber.firstName, subscriber.lastName, '', '', '', fbMessageTag)
                                SequenceMessagesQueueDataLayer.deleteOneObject(message._id)
                                  .then(result => {})
                                  .catch(err => {
                                    logger.serverLog(TAG, `Failed to delete sequenceMessageQueue ${JSON.stringify(err)}`)
                                  })
                              })
                              .catch(err => {
                                logger.serverLog(TAG, `Failed to create SequenceSubscribersMessage ${JSON.stringify(err)}`)
                              })
                          } else {
                            logger.serverLog(TAG, 'Not even one condition is satisfied')
                          }
                        }
                      } else { // No segmentation
                        logger.serverLog(TAG, 'at least one condition satisfied')
                        SequenceDataLayer.createForSequenceSubscribersMessages(sequenceSubMessagePayload)
                          .then(result => {
                            SequenceDataLayer.genericUpdateForSequenceMessages({_id: sequenceMessage._id}, {$inc: {sent: 1}}, {multi: true})
                              .then(updated => {})
                              .catch(err => {
                                logger.serverLog(TAG, `Failed to update sequenceMessage ${JSON.stringify(err)}`)
                              })
                            let fbMessageTag = 'NON_PROMOTIONAL_SUBSCRIPTION'
                            BroadcastUtility.getBatchData(newPayload, subscriber.senderId, page, sendBroadcast, subscriber.firstName, subscriber.lastName, '', '', '', fbMessageTag)
                            SequenceMessagesQueueDataLayer.deleteOneObject(message._id)
                              .then(result => {})
                              .catch(err => {
                                logger.serverLog(TAG, `Failed to delete sequenceMessageQueue ${JSON.stringify(err)}`)
                              })
                          })
                          .catch(err => {
                            logger.serverLog(TAG, `Failed to create SequenceSubscribersMessage ${JSON.stringify(err)}`)
                          })
                      }
                    }) // Tags find ends here
                    .catch(err => {
                      logger.serverLog(TAG, `Failed to fetch tags ${JSON.stringify(err)}`)
                    })
                }) // Sequence Subscriber find ends here
                .catch(err => {
                  logger.serverLog(TAG, `Failed to fetch sequence subscriber ${JSON.stringify(err)}`)
                })
            }) // Page find ends here
            .catch(err => {
              logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`)
            })
        }) // Company find ends here
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch companyUser ${JSON.stringify(err)}`)
        })
    }) // Subscriber find ends here
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(err)}`)
    })
}

const sendBroadcast = (batchMessages, page) => {
  const r = request.post('https://graph.facebook.com', (err, httpResponse, response) => {
    if (err) {
      return logger.serverLog(TAG, `Batch send error ${JSON.stringify(err)}`)
    }
    logger.serverLog(TAG, `Batch send response ${JSON.stringify(response.body)}`)
  })
  const form = r.form()
  form.append('access_token', page.accessToken)
  form.append('batch', batchMessages)
}
