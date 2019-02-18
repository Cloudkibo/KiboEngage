const logger = require('../../../components/logger')
const AutomationQueueDataLayer = require('../automationQueue/automationQueue.datalayer')
const AutoPostingDataLayer = require('../autoposting/autoposting.datalayer')
const URLDataLayer = require('../URLForClickedCount/URL.datalayer')
const AutopostingMessagesDataLayer = require('../autopostingMessages/autopostingMessages.datalayer')
const AutopostingSubscriberMessagesDataLayer = require('../autopostingMessages/autopostingSubscriberMessages.datalayer')
const broadcastUtility = require('../broadcasts/broadcasts.utility')
const autopostingLogicLayer = require('./autoposting.logiclayer')
const compUtility = require('../../../components/utility')
const og = require('open-graph')
const request = require('request')
const TAG = 'api/v1/facebookEvents/autoposting.controller.js'
let config = require('./../../../config/environment')
const utility = require('../utility')

exports.autoposting = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  // TODO REMOVE THIS RETURN AFTER DEBUGGING
  return ;
  logger.serverLog(TAG, `in autoposting ${JSON.stringify(req.body)}`)
  for (let i = 0; i < req.body.entry[0].changes.length; i++) {
    const event = req.body.entry[0].changes[i]
    if (event.value.verb === 'add' &&
      (['status', 'photo', 'video', 'share'].indexOf(event.value.item) >
        -1)) {
      if (event.value.item === 'share' && event.value.link) {
        og(event.value.link, (err, meta) => {
          if (err) {
            logger.serverLog(TAG, `Error: ${err}`)
          }
          logger.serverLog(TAG, `Url Meta: ${JSON.stringify(meta)}`)
          if (meta && meta.image && meta.image.url) {
            event.value.image = meta.image.url
          }
          // TODO FIX THIS FUNCTION
          // handleThePagePostsForAutoPosting(req, event)
        })
      } else if (event.value.item === 'video' && event.value.message) {
        // TODO FIX THIS FUNCTION
        // handleThePagePostsForAutoPosting(req, event, 'status')
        // TODO FIX THIS FUNCTION
        // handleThePagePostsForAutoPosting(req, event)
      } else {
        // TODO FIX THIS FUNCTION
        // handleThePagePostsForAutoPosting(req, event)
      }
    }
  }
}
function handleThePagePostsForAutoPosting (req, event, status) {
  AutoPostingDataLayer.findAllAutopostingObjectsUsingQuery({ accountUniqueName: event.value.sender_id, isActive: true })
    .then(autopostings => {
      autopostings.forEach(postingItem => {
        let pagesFindCriteria = autopostingLogicLayer.pagesFindCriteria(postingItem)
        utility.callApi(`pages/query`, 'post', pagesFindCriteria, req.headers.authorization)
          .then(pages => {
            pages.forEach(page => {
              let subscriberFindCriteria = autopostingLogicLayer.subscriberFindCriteria(postingItem, page)
              utility.callApi(`subscribers/query`, 'post', subscriberFindCriteria, req.headers.authorization)
                .then(subscribers => {
                  logger.serverLog(TAG,
                    `Total Subscribers of page ${page.pageName} are ${subscribers.length}`)
                  AutopostingMessagesDataLayer.createAutopostingMessage({
                    pageId: page._id,
                    companyId: postingItem.companyId,
                    autoposting_type: 'facebook',
                    autopostingId: postingItem._id,
                    sent: subscribers.length,
                    message_id: event.value.post_id,
                    seen: 0,
                    clicked: 0
                  })
                    .then(savedMsg => {
                      if (subscribers.length > 0) {
                        broadcastUtility.applyTagFilterIfNecessary({ body: postingItem }, subscribers, (taggedSubscribers) => {
                          taggedSubscribers.forEach(subscriber => {
                            let messageData = {}
                            if (event.value.item === 'status' || status) {
                              messageData = autopostingLogicLayer(subscriber, event)
                              // Logic to control the autoposting when last activity is less than 30 minutes
                              compUtility.checkLastMessageAge(subscriber.senderId, req, (err, isLastMessage) => {
                                if (err) {
                                  logger.serverLog(TAG, 'inside error')
                                  return logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                                }

                                if (isLastMessage) {
                                  logger.serverLog(TAG, 'inside fb autoposting send')
                                  sendAutopostingMessage(messageData, page, savedMsg)
                                } else {
                                  // Logic to add into queue will go here
                                  logger.serverLog(TAG, 'inside adding to fb autoposting queue')
                                  AutomationQueueDataLayer.createAutomationQueueObject(autopostingLogicLayer.prepareAutomationQueuePayload(savedMsg, subscriber))
                                    .then(saved => {})
                                    .catch(err => {
                                      logger.serverLog(TAG, `Failed to save automationQueue ${JSON.stringify(err)}`)
                                    })
                                }
                              })
                            } else if (event.value.item === 'share') {
                              URLDataLayer.createURLObject({
                                originalURL: event.value.link,
                                subscriberId: subscriber._id,
                                module: {
                                  id: savedMsg._id,
                                  type: 'autoposting'
                                }
                              })
                                .then(savedurl => {
                                  let newURL = config.domain + '/api/URL/' + savedurl._id
                                  messageData = autopostingLogicLayer.prepareMessageDataForShare(subscriber, event, newURL)
                                  // Logic to control the autoposting when last activity is less than 30 minutes
                                  compUtility.checkLastMessageAge(subscriber.senderId, req, (err, isLastMessage) => {
                                    if (err) {
                                      logger.serverLog(TAG, 'inside error')
                                      return logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                                    }

                                    if (isLastMessage) {
                                      logger.serverLog(TAG, 'inside fb autoposting send')
                                      sendAutopostingMessage(messageData, page, savedMsg)
                                    } else {
                                      // Logic to add into queue will go here
                                      logger.serverLog(TAG, 'inside adding to fb autoposting queue')
                                      AutomationQueueDataLayer.createAutomationQueueObject(autopostingLogicLayer.prepareAutomationQueuePayload(savedMsg, subscriber))
                                        .then(saved => {})
                                        .catch(err => {
                                          logger.serverLog(TAG, `Failed to create automation queue object ${JSON.stringify(err)}`)
                                        })
                                    }
                                  })
                                })
                                .catch(err => {
                                  logger.serverLog(TAG, `Failed to save url ${JSON.stringify(err)}`)
                                })
                            } else if (event.value.item === 'photo') {
                              URLDataLayer.createURLObject({originalURL: 'https://www.facebook.com/' + event.value.sender_id,
                                subscriberId: subscriber._id,
                                module: {
                                  id: savedMsg._id,
                                  type: 'autoposting'
                                }
                              })
                                .then(savedurl => {
                                  let newURL = config.domain + '/api/URL/' + savedurl._id
                                  messageData = AutoPostingDataLayer.prepareMessageDataForImage(subscriber, event, newURL)
                                  // Logic to control the autoposting when last activity is less than 30 minutes
                                  compUtility.checkLastMessageAge(subscriber.senderId, req, (err, isLastMessage) => {
                                    if (err) {
                                      logger.serverLog(TAG, 'inside error')
                                      return logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                                    }

                                    if (isLastMessage) {
                                      logger.serverLog(TAG, 'inside fb autoposting send')
                                      sendAutopostingMessage(messageData, page, savedMsg)
                                    } else {
                                      // Logic to add into queue will go here
                                      logger.serverLog(TAG, 'inside adding to fb autoposting queue')
                                      AutomationQueueDataLayer.createAutomationQueueObject(autopostingLogicLayer.prepareAutomationQueuePayload(savedMsg, subscriber))
                                        .then(saved => {})
                                        .catch(err => {
                                          logger.serverLog(TAG, `Failed to save automation queue ${JSON.stringify(err)}`)
                                        })
                                    }
                                  })
                                })
                                .catch(err => {
                                  logger.serverLog(TAG, `Failed to save url ${JSON.stringify(err)}`)
                                })
                            } else if (event.value.item === 'video') {
                              messageData = autopostingLogicLayer.prepareMessageDataForVideo(subscriber, event)
                              // Logic to control the autoposting when last activity is less than 30 minutes
                              compUtility.checkLastMessageAge(subscriber.senderId, req, (err, isLastMessage) => {
                                if (err) {
                                  logger.serverLog(TAG, 'inside error')
                                  return logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                                }

                                if (isLastMessage) {
                                  logger.serverLog(TAG, 'inside fb autoposting send')
                                  sendAutopostingMessage(messageData, page, savedMsg)
                                } else {
                                  // Logic to add into queue will go here
                                  logger.serverLog(TAG, 'inside adding to fb autoposting queue')
                                  AutomationQueueDataLayer.createAutomationQueueObject(autopostingLogicLayer.prepareAutomationQueuePayload(savedMsg, subscriber))
                                    .then(saved => {})
                                    .catch(err => {
                                      logger.serverLog(TAG, `Failed to create automation queue object ${JSON.stringify(err)}`)
                                    })
                                }
                              })
                            }
                            AutopostingSubscriberMessagesDataLayer.createAutopostingSubscriberMessage({pageId: page.pageId,
                              companyId: postingItem.companyId,
                              autopostingId: postingItem._id,
                              autoposting_messages_id: savedMsg._id,
                              subscriberId: subscriber.senderId})
                              .then(savedSubscriberMsg => {})
                              .catch(err => {
                                logger.serverLog(TAG, `Failed to create automation queue object ${JSON.stringify(err)}`)
                              })
                          })
                        })
                      }
                    })
                    .catch(err => {
                      logger.serverLog(TAG, `Failed to save autoposting message ${JSON.stringify(err)}`)
                    })
                })
                .catch(err => {
                  logger.serverLog(TAG, `Failed to fetch subscribers ${JSON.stringify(err)}`)
                })
            })
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to fetch pages ${JSON.stringify(err)}`)
          })
      })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch autopostings ${JSON.stringify(err)}`)
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
      if (err) {
        return logger.serverLog(TAG,
          `At send fb post broadcast ${JSON.stringify(
            err)}`)
      } else {
        if (res.statusCode !== 200) {
          logger.serverLog(TAG,
            `At send fb post broadcast response ${JSON.stringify(
              res.body.error)}`)
        } else {
          logger.serverLog(TAG,
            `At send fb post broadcast response ${JSON.stringify(
              res.body.message_id)}`)
        }
      }
    })
}
