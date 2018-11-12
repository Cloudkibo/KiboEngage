let mongoose = require('mongoose')
const utility = require('../server/api/v1/utility')
const logger = require('../server/components/logger')
const config = require('../server/config/environment')
const SequenceMessagesQueueDataLayer = require('../server/api/v1/sequenceMessageQueue/sequenceMessageQueue.datalayer')
const SequenceDataLayer = require('../server/api/v1/sequenceMessaging/sequence.datalayer')
const BroadcastUtility = require('../server/api/v1/broadcasts/broadcasts.utility')
const LogicLayer = require('./logiclayer')
const TAG = 'scripts/SequenceMessageQueueScript.js'
const util = require('util')

const request = require('request')
mongoose = mongoose.connect(config.mongo.uri)
console.log('mongoose', util.inspect(config.mongo.uri))
SequenceMessagesQueueDataLayer.findAll()
  .then(data => {
    if (data) {
      for (let i = 0; i < data.length; i++) {
        let message = data[i]
        if (message.queueScheduledTime.getTime() < new Date().getTime()) {
          if (message.trigger.event === 'does_not_see') {
            SequenceDataLayer.genericFindForSubscriberMessages({messageId: message.trigger.value, subscriberId: message.subscriberId})
              .then(sequenceSubscriberMessage => {
                if (sequenceSubscriberMessage.seen) {
                  SequenceMessagesQueueDataLayer.deleteOneObject(message._id)
                    .then(result => {})
                    .catch(err => {
                      logger.serverLog(TAG, `Failed to delete SequenceMessagesQueue ${JSON.stringify(err)}`)
                    })
                } else {
                  sendSequenceMessage(message)
                }
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to fetch subscriber messages ${JSON.stringify(err)}`)
              })
          } else {
            sendSequenceMessage(message)
          }
        }
        if (!(i + 1 < data.length)) {
          // Do work to reschedule the message
          setTimeout(function (mongoose) { closeDB(mongoose) }, 20000)
        }
      } // For loop ends here
      if (data.length === 0) {
        // Do work to reschedule the message
        console.log('data is empty.')
        setTimeout(function (mongoose) { closeDB(mongoose) }, 20000)
      }
    } // If data clause check
    if (data.length === 0) {
      // Do work to reschedule the message
      console.log('data is empty outside')
      setTimeout(function (mongoose) { closeDB(mongoose) }, 20000)
    }
  }) // Quence find ends here
  .catch(err => {
    logger.serverLog(TAG, `Failed to fetch SequenceMessagesQueue ${JSON.stringify(err)}`)
    console.log(`Failed to fetch SequenceMessagesQueue ${JSON.stringify(err)}`)
  })

function closeDB () {
  // mongoose.disconnect(function (err) {
  //   if (err) throw err
  //   console.log('exiting')
  //   process.exit()
  // })
}

function sendSequenceMessage (message) {
  SequenceDataLayer.genericFindForSequence({ '_id': message.sequenceId })
    .then(sequence => {
      sequence = sequence[0]
      SequenceDataLayer.genericFindForSequenceMessages({ '_id': message.sequenceMessageId })
        .then(sequenceMessage => {
          sequenceMessage = sequenceMessage[0]
          utility.callApi(`subscribers/${message.subscriberId}`)
            .then(subscriber => {
              utility.callApi(`companyUser/query`, 'post', { 'companyId': message.companyId })
                .then(companyUser => {
                  utility.callApi(`pages/${subscriber.pageId}`)
                    .then(page => {
                      SequenceDataLayer.genericFindForSequenceSubscribers({'subscriberId': subscriber._id, 'sequenceId': sequence.id})
                        .then(seqSub => {
                          seqSub = seqSub[0]
                          utility.callApi(`tags/query`, 'post', {'companyId': companyUser.companyId})
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
                              // mongoose.disconnect((err) => {
                              //   if (err) throw err
                              //   process.exit()
                              // })
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
        }) // Sequence Message find ends here
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch sequence message ${JSON.stringify(err)}`)
        })
    }) // Sequence Find ends here
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch sequence ${JSON.stringify(err)}`)
    })
}

const sendBroadcast = (batchMessages, page) => {
  const r = request.post('https://graph.facebook.com', (err, httpResponse, body) => {
    if (err) {
      return logger.serverLog(TAG, `Batch send error ${JSON.stringify(err)}`)
    }
    logger.serverLog(TAG, `Batch send response ${JSON.stringify(body)}`)
  })
  const form = r.form()
  form.append('access_token', page.accessToken)
  form.append('batch', batchMessages)
}
