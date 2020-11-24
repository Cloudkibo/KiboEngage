const logger = require('../../../components/logger')
const TAG = 'api/twitterEvents/twitter.controller.js'
const AutoPosting = require('../autoposting/autoposting.datalayer')
const AutoPostingMessage = require('../autopostingMessages/autopostingMessages.datalayer')
const utility = require('../utility')
const _ = require('lodash')
const logicLayer = require('./logiclayer')
const { facebookApiCaller } = require('../../global/facebookApiCaller')
const { prepareSubscribersCriteria } = require('../../global/utility')
const { sendUsingBatchAPI } = require('../../global/sendConversation')
const { isApprovedForSMP } = require('../../global/subscriptionMessaging')

exports.findAutoposting = function (req, res) {
  AutoPosting.findAllAutopostingObjectsUsingQuery({subscriptionType: 'twitter', isActive: true})
    .then(autoposting => {
      return res.status(200).json({
        status: 'success',
        payload: autoposting
      })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.findAutoposting`, req.body, {user: req.user}, 'error')
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
                      const message = response.body.error || 'Failed to send approval message'
                      logger.serverLog(message, `${TAG}: exports.twitterwebhook`, req.body, {user: req.user}, 'error')
                    }
                  })
                  .catch(err => {
                    const message = err || 'Failed to send approval message'
                    logger.serverLog(message, `${TAG}: exports.twitterwebhook`, req.body, {user: req.user}, 'error')
                  })
                let tweetData = {
                  autopostingId: postingItem._id,
                  tweet: req.body,
                  expiryTime: new Date(new Date().getTime() + 60 * 60 * 24 * 1000)
                }
                utility.callApi('tweets_queue', 'post', tweetData, 'kiboengage')
                  .then(created => {
                  })
                  .catch(err => {
                    const message = err || 'Failed to push tweet in queue'
                    logger.serverLog(message, `${TAG}: exports.twitterwebhook`, req.body, {user: req.user}, 'error')
                  })
              })
              .catch(err => {
                const message = err || 'Failed to fetch page admin subscription'
                logger.serverLog(message, `${TAG}: exports.twitterwebhook`, req.body, {user: req.user}, 'error')
              })
          } else {
            sendTweet(postingItem, req)
          }
        }
      })
    })
    .catch(err => {
      const message = err || 'Internal server error while fetching autoposts'
      logger.serverLog(message, `${TAG}: exports.twitterwebhook`, req.body, {user: req.user}, 'error')
    })
}

const sendTweet = (postingItem, req) => {
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
      const message = err || 'Internal server error while fetching pages'
      logger.serverLog(message, `${TAG}: sendTweet`, req.body, {user: req.user}, 'error')
    })
}

const sendToMessenger = (postingItem, page, req) => {
  let subscribersData = [
    {$match: {pageId: page._id, companyId: page.companyId, isSubscribed: true, completeInfo: true}},
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
                isApprovedForSMP({pageId: page.pageId, accessToken: page.accessToken})
                  .then(smpStatus => {
                    let smp = false
                    if ((smpStatus === 'approved')) {
                      smp = true
                    }
                    let subsFindCriteria = prepareSubscribersCriteria(req.body, page, undefined, messageData.length, smp)
                    if (postingItem.isSegmented && postingItem.segmentationTags.length > 0) {
                      utility.callApi(`tags/query`, 'post', { companyId: page.companyId, tag: { $in: postingItem.segmentationTags } })
                        .then(tags => {
                          let tagIds = tags.map((t) => t._id)
                          utility.callApi(`tags_subscriber/query`, 'post', { tagId: { $in: tagIds } })
                            .then(tagSubscribers => {
                              if (tagSubscribers.length > 0) {
                                let subscriberIds = tagSubscribers.map((ts) => ts.subscriberId._id)
                                subsFindCriteria['_id'] = {$in: subscriberIds}
                                _countUpdate(subsFindCriteria, req.body.id.toString())
                                sendUsingBatchAPI('autoposting', messageData, {criteria: subsFindCriteria}, page, '', reportObj)
                              }
                            })
                            .catch(err => {
                              const message = err || 'Internal Server Error'
                              logger.serverLog(message, `${TAG}: sendToMessenger`, req.body, {user: req.user}, 'error')
                            })
                        })
                        .catch(err => {
                          const message = err || 'Internal Server Error'
                          logger.serverLog(message, `${TAG}: sendToMessenger`, req.body, {user: req.user}, 'error')
                        })
                    } else {
                      _countUpdate(subsFindCriteria, req.body.id.toString())
                      sendUsingBatchAPI('autoposting', messageData, {criteria: subsFindCriteria}, page, '', reportObj)
                    }
                  }).catch(err => {
                    const message = err || 'Internal Server Error'
                    logger.serverLog(message, `${TAG}: sendToMessenger`, req.body, {user: req.user}, 'error')
                  })
              })
              .catch(err => {
                const message = err || 'Failed to prepare data'
                logger.serverLog(message, `${TAG}: sendToMessenger`, req.body, {user: req.user}, 'error')
              })
          })
          .catch(err => {
            const message = err || 'Failed to create autoposting message'
            logger.serverLog(message, `${TAG}: sendToMessenger`, req.body, {user: req.user}, 'error')
          })
      }
    })
    .catch(err => {
      const message = err || 'Failed to fetch subscriber count'
      logger.serverLog(message, `${TAG}: sendToMessenger`, req.body, {user: req.user}, 'error')
    })
}

const _countUpdate = (subsFindCriteria, messageId) => {
  let subscriberCountCriteria = [...subsFindCriteria]
  delete subscriberCountCriteria[0].$limit
  subscriberCountCriteria.push({$group: {_id: null, count: {$sum: 1}}})
  utility.callApi(`subscribers/aggregate`, 'post', subscriberCountCriteria)
    .then(response => {
      AutoPostingMessage.findOneAutopostingMessageAndUpdate({message_id: messageId}, {sent: response.length > 0 ? response[0].count : 0}, {})
        .then(Autopostingresponse => {
        }).catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: _countUpdate`, {subsFindCriteria, messageId}, {}, 'error')
        })
    }).catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _countUpdate`, {subsFindCriteria, messageId}, {}, 'error')
    })
}

const postOnFacebook = (postingItem, page, req) => {
  logicLayer.handleTwitterPayload(req, {}, page, 'facebook')
    .then(messageData => {
      if (messageData.type === 'text') {
        facebookApiCaller('v3.3', `${page.pageId}/feed?access_token=${page.accessToken}`, 'post', messageData.payload)
          .then(response => {
            if (response.body.error) {
              const message = response.body.error || 'Failed to post on facebook'
              logger.serverLog(message, `${TAG}: postOnFacebook`, req.body, {user: req.user}, 'error')
            } else {
              savePostObject(postingItem, page, req, messageData, response.body.post_id ? response.body.post_id : response.body.id)
            }
          })
          .catch(err => {
            const message = err || 'Failed to post on facebook'
            logger.serverLog(message, `${TAG}: postOnFacebook`, req.body, {user: req.user}, 'error')
          })
      } else if (messageData.type === 'image') {
        facebookApiCaller('v3.3', `${page.pageId}/photos?access_token=${page.accessToken}`, 'post', messageData.payload)
          .then(response => {
            if (response.body.error) {
              const message = response.body.error || 'Failed to post on facebook'
              logger.serverLog(message, `${TAG}: postOnFacebook`, req.body, {user: req.user}, 'error')
            } else {
              savePostObject(postingItem, page, req, messageData, response.body.post_id ? response.body.post_id : response.body.id)
            }
          })
          .catch(err => {
            const message = err || 'Failed to post on facebook'
            logger.serverLog(message, `${TAG}: postOnFacebook`, req.body, {user: req.user}, 'error')
          })
      } else if (messageData.type === 'images') {
        facebookApiCaller('v3.3', `${page.pageId}/feed?access_token=${page.accessToken}`, 'post', messageData.payload)
          .then(response => {
            if (response.body.error) {
              const message = response.body.error || 'Failed to post on facebook'
              logger.serverLog(message, `${TAG}: postOnFacebook`, req.body, {user: req.user}, 'error')
            } else {
              savePostObject(postingItem, page, req, messageData, response.body.post_id ? response.body.post_id : response.body.id)
            }
          })
          .catch(err => {
            const message = err || 'Failed to post on facebook'
            logger.serverLog(message, `${TAG}: postOnFacebook`, req.body, {user: req.user}, 'error')
          })
      } else if (messageData.type === 'video') {
        facebookApiCaller('v3.3', `${page.pageId}/videos?access_token=${page.accessToken}`, 'post', messageData.payload)
          .then(response => {
            if (response.body.error) {
              const message = response.body.error || 'Failed to post on facebook'
              logger.serverLog(message, `${TAG}: postOnFacebook`, req.body, {user: req.user}, 'error')
            } else {
              savePostObject(postingItem, page, req, messageData, `${page.pageId}_${response.body.id}`)
            }
          })
          .catch(err => {
            const message = err || 'Failed to post on facebook'
            logger.serverLog(message, `${TAG}: postOnFacebook`, req.body, {user: req.user}, 'error')
          })
      }
    })
    .catch(err => {
      const message = err || 'Failed to prepare data'
      logger.serverLog(message, `${TAG}: postOnFacebook`, req.body, {user: req.user}, 'error')
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
    })
    .catch(err => {
      const message = err || 'Failed to create post object'
      logger.serverLog(message, `${TAG}: savePostObject`, req.body, {user: req.user}, 'error')
    })
}

exports.sendTweet = sendTweet
