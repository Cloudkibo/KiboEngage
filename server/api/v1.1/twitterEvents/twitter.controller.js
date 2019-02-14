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
const config = require('../../../config/environment/index')

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
  // logger.serverLog(TAG, `in twitterwebhook ${JSON.stringify(req.body)}`)
  console.log('in twitter webhook', req.body)
  AutoPosting.findAllAutopostingObjectsUsingQuery({accountUniqueName: req.body.user.screen_name, isActive: true})
    .then(autopostings => {
      console.log('autopostings found', autopostings)
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
            console.log('pagesfound', pages.length)
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
                  console.log('subscribers found', subscribers.length)
                  if (subscribers.length > 0) {
                    let newMsg = {
                      pageId: page._id,
                      companyId: postingItem.companyId,
                      autoposting_type: 'twitter',
                      autopostingId: postingItem._id,
                      sent: subscribers.length,
                      message_id: req.body.id,
                      seen: 0,
                      clicked: 0
                    }
                    AutoPostingMessage.createAutopostingMessage(newMsg)
                      .then(savedMsg => {
                        console.log('new autoposting message created', savedMsg)
                        broadcastUtility.applyTagFilterIfNecessary({body: postingItem}, subscribers, (taggedSubscribers) => {
                          taggedSubscribers.forEach(subscriber => {
                            let messageData = {}
                            if (!req.body.entities.media) { // (tweet.entities.urls.length === 0 && !tweet.entities.media) {
                              messageData = {
                                'messaging_type': 'UPDATE',
                                'recipient': JSON.stringify({
                                  'id': subscriber.senderId
                                }),
                                'message': JSON.stringify({
                                  'text': req.body.text,
                                  'metadata': 'This is a meta data for tweet'
                                })
                              }
                              // Logic to control the autoposting when last activity is less than 30 minutes
                              compUtility.checkLastMessageAge(subscriber.senderId, req, (err, isLastMessage) => {
                                if (err) {
                                  logger.serverLog(TAG, 'inside error')
                                  return logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                                }
                                if (isLastMessage) {
                                  logger.serverLog(TAG, 'inside autoposting send')
                                  sendAutopostingMessage(messageData, page, savedMsg)
                                  let newAutoPostingSubscriberMsg = {
                                    pageId: page.pageId,
                                    companyId: postingItem.companyId,
                                    autopostingId: postingItem._id,
                                    autoposting_messages_id: savedMsg._id,
                                    subscriberId: subscriber.senderId
                                  }
                                  AutoPostingSubscriberMessage.createAutopostingSubscriberMessage(newAutoPostingSubscriberMsg)
                                    .then(result => {
                                      console.log('AutoPostingSubscriberMessage created', result)
                                      logger.serverLog(TAG, `autoposting subsriber message saved for subscriber id ${subscriber.senderId}`)
                                      return res.status(200).json({
                                        status: 'success',
                                        description: `Twitter Broadcast Message Sent`
                                      })
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
                                          return res.status(200).json({
                                            status: 'success',
                                            description: `Twitter Broadcast Message Sent`
                                          })
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
                            } else {
                              let URLObject = {
                                originalURL: req.body.entities.media[0].url,
                                subscriberId: subscriber._id,
                                module: {
                                  id: savedMsg._id,
                                  type: 'autoposting'
                                }
                              }
                              URLObject.createURLObject(URLObject)
                                .then(savedurl => {
                                  let newURL = config.domain + '/api/URL/' + savedurl._id
                                  messageData = {
                                    'messaging_type': 'UPDATE',
                                    'recipient': JSON.stringify({
                                      'id': subscriber.senderId
                                    }),
                                    'message': JSON.stringify({
                                      'attachment': {
                                        'type': 'template',
                                        'payload': {
                                          'template_type': 'generic',
                                          'elements': [
                                            {
                                              'title': req.body.text,
                                              'image_url': req.body.entities.media[0].media_url,
                                              'subtitle': 'kibopush.com',
                                              'buttons': [
                                                {
                                                  'type': 'web_url',
                                                  'url': newURL,
                                                  'title': 'View Tweet'
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      }
                                    })
                                  }
                                  compUtility.checkLastMessageAge(subscriber.senderId, req, (err, isLastMessage) => {
                                    if (err) {
                                      logger.serverLog(TAG, 'inside error')
                                      return logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                                    }

                                    if (isLastMessage) {
                                      logger.serverLog(TAG, 'inside autoposting autoposting twitter send')
                                      sendAutopostingMessage(messageData, page, savedMsg)
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
                                          return res.status(200).json({
                                            status: 'success',
                                            description: `Twitter Broadcast Message Sent`
                                          })
                                        })
                                        .catch(err => {
                                          if (err) logger.serverLog(TAG, `Error in creating Autoposting message object ${err}`)
                                        })
                                    } else {
                                      // Logic to add into queue will go here
                                      logger.serverLog(TAG, 'inside adding to autoposting queue')
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
                                            status: 'status',
                                            description: 'Automation queue object saved'
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
                                              return res.status(200).json({
                                                status: 'success',
                                                description: `Twitter Broadcast Message Sent`
                                              })
                                            })
                                            .catch(err => {
                                              if (err) logger.serverLog(TAG, `Error in creating Autoposting message object ${err}`)
                                            })
                                        })
                                        .catch(err => {
                                          if (err) logger.serverLog(TAG, `Internal server error while saving automation queue object ${err}`)
                                        })
                                    }
                                  })
                                })
                                .catch(err => {
                                  if (err) logger.serverLog(TAG, `Internal server error while creating URL object ${err}`)
                                })
                            }
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
  console.log('sendAutopostingMessage')
  request(
    {
      'method': 'POST',
      'json': true,
      'formData': messageData,
      'uri': 'https://graph.facebook.com/v2.6/me/messages?access_token=' +
      page.accessToken
    },
    function (err, res) {
      console.log('Response from facebook', res)
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
