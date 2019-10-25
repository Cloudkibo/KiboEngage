const logger = require('../../../components/logger')
const TAG = 'api/twitterEvents/twitter.controller.js'
const AutoPosting = require('../autoposting/autoposting.datalayer')
const AutoPostingMessage = require('../autopostingMessages/autopostingMessages.datalayer')
const utility = require('../utility')
const _ = require('lodash')
const logicLayer = require('./logiclayer')
const { facebookApiCaller } = require('../../global/facebookApiCaller')
let { sendOpAlert } = require('./../../global/operationalAlert')
const { prepareSubscribersCriteria } = require('../../global/utility')
const { sendUsingBatchAPI } = require('../../global/sendConversation')

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
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  AutoPosting.findAllAutopostingObjectsUsingQuery({accountUniqueName: req.body.user.screen_name, isActive: true})
    .then(autopostings => {
      autopostings.forEach(postingItem => {
        if (logicLayer.checkFilterStatus(postingItem, req)) {
          if (postingItem.moderateTweets) {
            utility.callApi('pageadminsubscriptions/query', 'post', {purpose: 'findOne', match: {companyId: postingItem.companyId, pageId: postingItem.approvalChannel.pageId}}, 'kiboengage')
              .then(pageadminsubscription => {
                let messageData = logicLayer.prepareApprovalMessage(
                  pageadminsubscription.subscriberId,
                  postingItem,
                  req
                )
                facebookApiCaller('v3.3', `me/messages?access_token=${postingItem.approvalChannel.pageAccessToken}`, 'post', messageData)
                  .then(response => {
                    if (response.body.error) {
                      logger.serverLog(TAG, `Failed to send approval message ${JSON.stringify(response.body.error)}`, 'error')
                      sendOpAlert(response.body.error, 'twitter controller in kiboengage', '', req.user._id, req.user.companyId)
                    } else {
                      logger.serverLog(TAG, `Approval message send successfully!`)
                    }
                  })
                  .catch(err => {
                    logger.serverLog(TAG, `Failed to send approval message ${err}`, 'error')
                  })
                let tweetData = {
                  autopostingId: postingItem._id,
                  tweet: req.body,
                  expiryTime: new Date(new Date().getTime() + 60 * 60 * 24 * 1000)
                }
                utility.callApi('tweets_queue', 'post', tweetData, 'kiboengage')
                  .then(created => {
                    logger.serverLog(TAG, 'Tweet has been pushed in queue', 'debug')
                  })
                  .catch(err => {
                    logger.serverLog(TAG, `Failed to push tweet in queue ${err}`, 'error')
                  })
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to fetch page admin subscription ${err}`, 'error')
              })
          } else {
            sendTweet(postingItem, req)
          }
        }
      })
    })
    .catch(err => {
      logger.serverLog(TAG, `Internal server error while fetching autoposts ${err}`, 'error')
    })
}

const sendTweet = (postingItem, req) => {
  let pagesFindCriteria = {
    companyId: postingItem.companyId,
    connected: true,
    gotPageSubscriptionPermission: true
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
  utility.callApi('pages/query', 'post', pagesFindCriteria)
    .then(pages => {
      pages.forEach(page => {
        if (postingItem.actionType === 'messenger') {
          sendToMessenger(postingItem, page, req)
        } else if (postingItem.actionType === 'facebook') {
          postOnFacebook(postingItem, page, req)
        } else if (postingItem.actionType === 'both') {
          sendToMessenger(postingItem, page, req)
          postOnFacebook(postingItem, page, req)
        }
      })
    })
    .catch(err => {
      if (err) logger.serverLog(TAG, `Internal server error while fetching pages ${err}`, 'error')
    })
}

const sendToMessenger = (postingItem, page, req) => {
  let subscribersData = [
    {$match: {pageId: page._id, companyId: page.companyId, isSubscribed: true}},
    {$group: {_id: null, count: {$sum: 1}}}
  ]
  utility.callApi('subscribers/aggregate', 'post', subscribersData)
    .then(subscribersCount => {
      if (subscribersCount.length > 0) {
        let newMsg = {
          pageId: page._id,
          companyId: postingItem.companyId,
          autoposting_type: 'twitter',
          autopostingId: postingItem._id,
          sent: subscribersCount[0].count,
          message_id: req.body.id.toString(),
          seen: 0,
          clicked: 0
        }
        AutoPostingMessage.createAutopostingMessage(newMsg)
          .then(savedMsg => {
            logicLayer.handleTwitterPayload(req, savedMsg, page, 'messenger')
              .then(messageData => {
                let reportObj = {
                  successful: 0,
                  unsuccessful: 0,
                  errors: []
                }
                let subsFindCriteria = prepareSubscribersCriteria(req.body, page)
                if (postingItem.isSegmented && postingItem.segmentationTags.length > 0) {
                  utility.callApi(`tags/query`, 'post', { companyId: page.companyId, tag: { $in: postingItem.segmentationTags } })
                    .then(tags => {
                      let tagIds = tags.map((t) => t._id)
                      utility.callApi(`tags_subscriber/query`, 'post', { tagId: { $in: tagIds } })
                        .then(tagSubscribers => {
                          if (tagSubscribers.length > 0) {
                            let subscriberIds = tagSubscribers.map((ts) => ts.subscriberId._id)
                            subsFindCriteria['_id'] = {$in: subscriberIds}
                            sendUsingBatchAPI('autoposting', messageData, subsFindCriteria, page, '', reportObj)
                            logger.serverLog(TAG, 'Conversation sent successfully!')
                          } else {
                            logger.serverLog(TAG, 'No subscribers match the given criteria', 'error')
                          }
                        })
                        .catch(err => {
                          logger.serverLog(TAG, err)
                        })
                    })
                    .catch(err => {
                      logger.serverLog(TAG, err)
                    })
                } else {
                  sendUsingBatchAPI('autoposting', messageData, subsFindCriteria, page, '', reportObj)
                  logger.serverLog(TAG, 'Conversation sent successfully!')
                }
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to prepare data ${err}`, 'error')
              })
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to create autoposting message ${JSON.stringify(err)}`, 'error')
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch subscriber count ${JSON.stringify(err)}`, 'error')
    })
}

const postOnFacebook = (postingItem, page, req) => {
  logicLayer.handleTwitterPayload(req, {}, page, 'facebook')
    .then(messageData => {
      if (messageData.type === 'text') {
        facebookApiCaller('v3.3', `${page.pageId}/feed?access_token=${page.accessToken}`, 'post', messageData.payload)
          .then(response => {
            if (response.body.error) {
              sendOpAlert(response.body.error, 'twitter controller in kiboengage', page._id, page.userId, page.companyId)
              logger.serverLog(TAG, `Failed to post on facebook ${JSON.stringify(response.body.error)}`, 'error')
            } else {
              logger.serverLog(TAG, `Posted successfully on Facebook ${JSON.stringify(response.body)}`, 'debug')
              savePostObject(postingItem, page, req, messageData, response.body.post_id ? response.body.post_id : response.body.id)
            }
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to post on facebook ${err}`, 'error')
          })
      } else if (messageData.type === 'image') {
        facebookApiCaller('v3.3', `${page.pageId}/photos?access_token=${page.accessToken}`, 'post', messageData.payload)
          .then(response => {
            if (response.body.error) {
              sendOpAlert(response.body.error, 'twitter controller in kiboengage', page._id, page.userId, page.companyId)
              logger.serverLog(TAG, `Failed to post on facebook ${JSON.stringify(response.body.error)}`, 'error')
            } else {
              logger.serverLog(TAG, `Posted successfully on Facebook ${JSON.stringify(response.body)}`, 'debug')
              savePostObject(postingItem, page, req, messageData, response.body.post_id ? response.body.post_id : response.body.id)
            }
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to post on facebook ${err}`, 'error')
          })
      } else if (messageData.type === 'images') {
        facebookApiCaller('v3.3', `${page.pageId}/feed?access_token=${page.accessToken}`, 'post', messageData.payload)
          .then(response => {
            if (response.body.error) {
              sendOpAlert(response.body.error, 'twitter controller in kiboengage', page._id, page.userId, page.companyId)
              logger.serverLog(TAG, `Failed to post on facebook ${JSON.stringify(response.body.error)}`, 'error')
            } else {
              logger.serverLog(TAG, `Posted successfully on Facebook ${JSON.stringify(response.body)}`, 'debug')
              savePostObject(postingItem, page, req, messageData, response.body.post_id ? response.body.post_id : response.body.id)
            }
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to post on facebook ${err}`, 'error')
          })
      } else if (messageData.type === 'video') {
        facebookApiCaller('v3.3', `${page.pageId}/videos?access_token=${page.accessToken}`, 'post', messageData.payload)
          .then(response => {
            if (response.body.error) {
              sendOpAlert(response.body.error, 'twitter controller in kiboengage', page._id, page.userId, page.companyId)
              logger.serverLog(TAG, `Failed to post on facebook ${JSON.stringify(response.body.error)}`, 'error')
            } else {
              logger.serverLog(TAG, `Posted successfully on Facebook ${JSON.stringify(response.body)}`, 'debug')
              savePostObject(postingItem, page, req, messageData, `${page.pageId}_${response.body.id}`)
            }
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to post on facebook ${err}`, 'error')
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to prepare data ${err}`, 'error')
    })
}

const savePostObject = (postingItem, page, req, messageData, postId) => {
  let newPost = {
    pageId: page._id,
    companyId: postingItem.companyId,
    autopostingType: 'twitter',
    autopostingId: postingItem._id,
    messageId: req.body.id.toString(),
    post: messageData,
    postId: postId,
    likes: 0,
    comments: 0
  }
  utility.callApi(`autoposting_fb_post`, 'post', newPost, 'kiboengage')
    .then(created => {
      logger.serverLog(TAG, 'Fb post object created successfully!', 'debug')
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to create post object ${err}`, 'error')
    })
}

exports.sendTweet = sendTweet
