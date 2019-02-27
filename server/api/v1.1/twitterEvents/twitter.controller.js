const logger = require('../../../components/logger')
const TAG = 'api/twitterEvents/twitter.controller.js'
let AutoPosting = require('../autoposting/autoposting.datalayer')
const utility = require('../utility')
let broadcastUtility = require('../broadcasts/broadcasts.utility')
const compUtility = require('../../../components/utility')
const AutomationQueue = require('../automationQueue/automationQueue.datalayer')
const AutoPostingMessage = require('../autopostingMessages/autopostingMessages.datalayer')
const AutoPostingSubscriberMessage = require('../autopostingMessages/autopostingSubscriberMessages.datalayer')
let request = require('request')
let _ = require('lodash')
const logicLayer = require('./logiclayer')

exports.findAutoposting = function (req, res) {
  logger.serverLog(TAG, `in findAutoposting ${JSON.stringify(req.body)}`)
  AutoPosting.findAllAutopostingObjectsUsingQuery({subscriptionType: 'twitter', isActive: true})
    .then(autoposting => {
      return res.status(200).json({
        status: 'success',
        payload: autoposting
      })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal server error while fetching autopots ${err}`
      })
    })
}

exports.twitterwebhook = function (req, res) {
  logger.serverLog(TAG, `in twitterwebhook ${JSON.stringify(req.body)}`)
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  AutoPosting.findAllAutopostingObjectsUsingQuery({accountUniqueName: req.body.user.screen_name, isActive: true})
    .then(autopostings => {
      logger.serverLog(TAG, `autoposting found ${JSON.stringify(autopostings)}`)
      autopostings.forEach(postingItem => {
        let pagesFindCriteria = {
          companyId: postingItem.companyId,
          connected: true
        }
        if (postingItem.isSegmented) {
          if (postingItem.segmentationPageIds && postingItem.segmentationPageIds.length > 0) {
            pagesFindCriteria = _.merge(pagesFindCriteria, {
              pageId: {
                $in: postingItem.segmentationPageIds
              }
            })
          }
        }
        utility.callApi('pages/query', 'post', pagesFindCriteria, req.headers.authorization)
          .then(pages => {
            logger.serverLog(TAG, `pages found ${JSON.stringify(pages)}`)
            pages.forEach(page => {
              let subscriberFindCriteria = {
                pageId: page._id,
                isSubscribed: true
              }

              if (postingItem.isSegmented) {
                if (postingItem.segmentationGender.length > 0) {
                  subscriberFindCriteria = _.merge(subscriberFindCriteria,
                    {
                      gender: {
                        $in: postingItem.segmentationGender
                      }
                    })
                }
                if (postingItem.segmentationLocale.length > 0) {
                  subscriberFindCriteria = _.merge(subscriberFindCriteria,
                    {
                      locale: {
                        $in: postingItem.segmentationLocale
                      }
                    })
                }
              }
              utility.callApi('subscribers/query', 'post', subscriberFindCriteria, req.headers.authorization)
                .then(subscribers => {
                  logger.serverLog(TAG, `subscribers found ${JSON.stringify(subscribers)}`)
                  if (subscribers.length > 0) {
                    let newMsg = {
                      pageId: page._id,
                      companyId: postingItem.companyId,
                      autoposting_type: 'twitter',
                      autopostingId: postingItem._id,
                      sent: subscribers.length,
                      message_id: req.body.id.toString(),
                      seen: 0,
                      clicked: 0
                    }
                    AutoPostingMessage.createAutopostingMessage(newMsg)
                      .then(savedMsg => {
                        logger.serverLog(TAG, `savedMsg ${JSON.stringify(savedMsg)}`)
                        broadcastUtility.applyTagFilterIfNecessary({body: postingItem}, subscribers, (taggedSubscribers) => {
                          logger.serverLog(TAG, `taggedSubscribers ${JSON.stringify(taggedSubscribers)}`)
                          taggedSubscribers.forEach(subscriber => {
                            logicLayer.checkType(req.body, subscriber, savedMsg)
                              .then(result => {
                                logger.serverLog(TAG, `checkType ${JSON.stringify(result)}`)
                                compUtility.checkLastMessageAge(subscriber.senderId, req, (err, isLastMessage) => {
                                  if (err) {
                                    logger.serverLog(TAG, 'inside error')
                                    logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                                  }
                                  logger.serverLog(TAG, `isLastMessage ${JSON.stringify(isLastMessage)}`)
                                  if (isLastMessage) {
                                    logger.serverLog(TAG, 'inside autoposting send')
                                    if (result.otherMessage) {
                                      sendAutopostingMessage(result.otherMessage, page, savedMsg)
                                    }
                                    sendAutopostingMessage(result.messageData, page, savedMsg)
                                    let newAutoPostingSubscriberMsg = {
                                      pageId: page.pageId,
                                      companyId: postingItem.companyId,
                                      autopostingId: postingItem._id,
                                      autoposting_messages_id: savedMsg._id,
                                      subscriberId: subscriber.senderId
                                    }
                                    AutoPostingSubscriberMessage.createAutopostingSubscriberMessage(newAutoPostingSubscriberMsg)
                                      .then(result => {
                                        logger.serverLog(TAG, `autoposting subsriber message saved for subscriber id ${subscriber.senderId}`)
                                      })
                                      .catch(err => {
                                        if (err) logger.serverLog(TAG, `Error in creating Autoposting message object ${err}`)
                                      })
                                  } else {
                                    // Logic to add into queue will go here
                                    logger.serverLog(TAG, 'inside adding autoposting-twitter to autoposting queue')
                                    let timeNow = new Date()
                                    let automatedQueueMessage = {
                                      automatedMessageId: savedMsg._id,
                                      subscriberId: subscriber._id,
                                      companyId: savedMsg.companyId,
                                      type: 'autoposting-twitter',
                                      scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)
                                    }

                                    AutomationQueue.createAutomationQueueObject(automatedQueueMessage)
                                      .then(result => {
                                        logger.serverLog(TAG, {
                                          status: 'success',
                                          description: 'Automation Queue autoposting-twitter Message created'
                                        })
                                        let newAutoPostingSubscriberMsg = {
                                          pageId: page.pageId,
                                          companyId: postingItem.companyId,
                                          autopostingId: postingItem._id,
                                          autoposting_messages_id: savedMsg._id,
                                          subscriberId: subscriber.senderId
                                        }
                                        AutoPostingSubscriberMessage.createAutopostingSubscriberMessage(newAutoPostingSubscriberMsg)
                                          .then(result => {
                                            logger.serverLog(TAG, `autoposting subsriber message saved for subscriber id ${subscriber.senderId}`)
                                          })
                                          .catch(err => {
                                            if (err) logger.serverLog(TAG, `Error in creating Autoposting message object ${err}`)
                                          })
                                      })
                                      .catch(error => {
                                        if (error) {
                                          logger.serverLog(TAG, {
                                            status: 'failed',
                                            description: 'Automation Queue autoposting-twitter Message create failed',
                                            error
                                          })
                                        }
                                      })
                                  }
                                })
                              })
                          })
                        })
                      })
                      .catch(err => {
                        if (err) logger.serverLog(TAG, `Internal server error while creating Autoposting ${err}`)
                      })
                  }
                })
                .catch(err => {
                  if (err) logger.serverLog(TAG, `Internal server error while fetching subscribers ${err}`)
                })
            })
          })
          .catch(err => {
            if (err) logger.serverLog(TAG, `Internal server error while fetching pages ${err}`)
          })
      })
    })
    .catch(err => {
      if (err) logger.serverLog(TAG, `Internal server error while fetching autoposts ${err}`)
    })
}

function sendAutopostingMessage (messageData, page, savedMsg) {
  request(
    {
      'method': 'POST',
      'json': true,
      'formData': messageData,
      'uri': 'https://graph.facebook.com/v2.6/me/messages?access_token=' +
      page.accessToken
    },
    function (err, res) {
      logger.serverLog(TAG, `sending tweet ${res.body}`)
      if (err) {
        return logger.serverLog(TAG,
          `At send tweet broadcast ${JSON.stringify(
            err)}`)
      } else {
        if (res.statusCode !== 200) {
          logger.serverLog(TAG,
            `At send tweet broadcast response ${JSON.stringify(
              res.body.error)}`)
        } //   res.body.message_id)}`, true)
      }
    })
}
