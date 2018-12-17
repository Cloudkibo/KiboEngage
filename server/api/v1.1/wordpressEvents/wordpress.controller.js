const logger = require('../../../components/logger')
const TAG = 'api/wordpressEvents/wordpress.controller.js'
let AutoPosting = require('../autoposting/autoposting.datalayer')
const utility = require('../utility')
let broadcastUtility = require('../broadcasts/broadcasts.utility')
const compUtility = require('../../../components/utility')
const AutomationQueue = require('../automationQueue/automationQueue.datalayer')
const AutoPostingMessage = require('../autopostingMessages/autopostingMessages.datalayer')
const AutoPostingSubscriberMessage = require('../autopostingMessages/autopostingSubscriberMessages.datalayer')
const URLObject = require('../URLForClickedCount/URL.datalayer')
let request = require('request')
let _ = require('lodash')
const config = require('../../../config/environment/index')

exports.postPublish = function (req, res) {
  logger.serverLog(TAG, `Wordpress post received : ${JSON.stringify(req.body)}`)
  let wpUrl = req.body.guid
  let wordpressUniqueId = wpUrl.split('/')[0] + wpUrl.split('/')[1] + '//' + wpUrl.split('/')[2]
  logger.serverLog(TAG, `Wordpress unique id:  ${JSON.stringify(wordpressUniqueId)}`)
  AutoPosting.findAllAutopostingObjectsUsingQuery({ accountUniqueName: wordpressUniqueId, isActive: true })
    .then(autopostings => {
      autopostings.forEach(postingItem => {
        let pagesFindCriteria = {
          companyId: postingItem.companyId._id,
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
                  if (subscribers.length > 0) {
                    let newMsg = {
                      pageId: page._id,
                      companyId: postingItem.companyId,
                      autoposting_type: 'wordpress',
                      autopostingId: postingItem._id,
                      sent: subscribers.length,
                      message_id: req.body.guid,
                      seen: 0,
                      clicked: 0
                    }
                    console.log('subscribers', subscribers, newMsg)
                    AutoPostingMessage.createAutopostingMessage(newMsg)
                      .then(savedMsg => {
                        console.log('Autposting New Message', savedMsg)
                        broadcastUtility.applyTagFilterIfNecessary({body: postingItem}, subscribers, (taggedSubscribers) => {
                          taggedSubscribers.forEach(subscriber => {
                            let messageData = {}
                            let urlObject = {
                              originalURL: req.body.guid,
                              subscriberId: subscriber._id,
                              module: {
                                id: savedMsg._id,
                                type: 'autoposting'
                              }
                            }
                            URLObject.createURLObject(urlObject)
                              .then(savedurl => {
                                console.log('Saved Url', savedurl)
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
                                            'title': req.body.post_title,
                                            'image_url': 'https://cdn.cloudkibo.com/public/img/wordpress.png',
                                            'subtitle': 'sent using kibopush.com',
                                            'buttons': [
                                              {
                                                'type': 'web_url',
                                                'url': newURL,
                                                'title': 'View Wordpress Blog Post'
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
                                    logger.serverLog(TAG, 'inside autoposting wordpress send')
                                    console.log('Inside Autoposting wordpress send')
                                    sendAutopostingMessage(messageData, page, savedMsg)
                                    let newSubscriberMsg = {
                                      pageId: page.pageId,
                                      companyId: postingItem.companyId,
                                      autopostingId: postingItem._id,
                                      autoposting_messages_id: savedMsg._id,
                                      subscriberId: subscriber.senderId
                                    }
                                    AutoPostingSubscriberMessage.createAutopostingSubscriberMessage(newSubscriberMsg)
                                      .then(result => {
                                        logger.serverLog(TAG, `autoposting subsriber message saved for subscriber id ${subscriber.senderId}`)
                                        return res.status(200).json({
                                          status: 'success',
                                          description: `Wordpress Broadcast Message Sent`
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
                                      type: 'autoposting-wordpress',
                                      scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)
                                    }
                                    AutomationQueue.createAutomationQueueObject(automatedQueueMessage)
                                      .then(result => {
                                        logger.serverLog(TAG, {
                                          status: 'status',
                                          description: 'Automation queue object saved'
                                        })
                                        let newSubscriberMsg = {
                                          pageId: page.pageId,
                                          companyId: postingItem.companyId,
                                          autopostingId: postingItem._id,
                                          autoposting_messages_id: savedMsg._id,
                                          subscriberId: subscriber.senderId
                                        }
                                        AutoPostingSubscriberMessage.createAutopostingSubscriberMessage(newSubscriberMsg)
                                          .then(result => {
                                            logger.serverLog(TAG, `autoposting subsriber message saved for subscriber id ${subscriber.senderId}`)
                                            return res.status(200).json({
                                              status: 'success',
                                              description: `Wordpress Broadcast Message Sent`
                                            })
                                          })
                                          .catch(err => {
                                            if (err) logger.serverLog(TAG, `Error in creating Autoposting message object ${err}`)
                                          })
                                      })
                                      .catch(err => {
                                        return res.status(500).json({
                                          status: 'failed',
                                          description: `Internal server error while saving automation queue object ${err}`
                                        })
                                      })
                                  }
                                })
                              })
                              .catch(err => {
                                return res.status(500).json({
                                  status: 'failed',
                                  description: `Internal server error while fetching url objects ${err}`
                                })
                              })
                          })
                        })
                      })
                      .catch(err => {
                        return res.status(500).json({
                          status: 'failed',
                          description: `Internal server error while fetching pages ${err}`
                        })
                      })
                  }
                })
                .catch(err => {
                  return res.status(500).json({
                    status: 'failed',
                    description: `Internal server error while fetching pages ${err}`
                  })
                })
            })
          })
          .catch(err => {
            return res.status(500).json({
              status: 'failed',
              description: `Internal server error while fetching pages ${err}`
            })
          })
      })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal server error while fetching autoposts ${err}`
      })
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
      console.log('Facebook Response', res)
      if (err) {
        return logger.serverLog(TAG,
          `At send wordpress broadcast ${JSON.stringify(
            err)}`)
      } else {
        if (res.statusCode !== 200) {
          logger.serverLog(TAG,
            `At send wordpress broadcast response ${JSON.stringify(
              res.body.error)}`)
        }
      }
    })
}
