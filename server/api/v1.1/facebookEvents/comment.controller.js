const logger = require('../../../components/logger')
const TAG = 'api/facebookEvents/comment.controller.js'
const needle = require('needle')
const utility = require('../utility')
const commentCaptureLogicLayer = require('./commentCapture.logiclayer')
let { sendOpAlert } = require('./../../global/operationalAlert')
const broadcastUtility = require('../broadcasts/broadcasts.utility')
const messengerEventsUtility = require('../messengerEvents/utility')

exports.sendCommentReply = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let postId = req.body.entry[0].changes[0].value.post_id
  let verb = req.body.entry[0].changes[0].value.verb
  forTweetPost(postId, verb)
  forCommentCapturePost(postId, verb, req.body)
}

function forTweetPost (postId, verb) {
  // increment comment count for tweet post
  let updateData = {
    purpose: 'updateAll',
    match: {
      postId: postId
    },
    updated: verb === 'add' ? {$inc: { comments: 1 }} : {$inc: { comments: -1 }},
    options: {}
  }
  utility.callApi('autoposting_fb_post', 'put', updateData, 'kiboengage')
    .then(updated => {
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to update likes count ${err}`, 'error')
    })
}
function forCommentCapturePost (postId, verb, body) {
  let pageId = postId.split('_')[0]
  let parentId = body.entry[0].changes[0].value.parent_id
  if (parentId === postId) {
    utility.callApi(`comment_capture/query`, 'post', {post_id: postId})
      .then(post => {
        post = post[0]
        if (post) {
          updateCommentsCount(verb, post._id)
          sendReply(post, body)
        } else {
          utility.callApi(`pages/query`, 'post', {pageId: pageId, connected: true})
            .then(page => {
              page = page[0]
              if (page) {
                utility.callApi(`comment_capture/query`, 'post', {pageId: page._id, post_id: {$exists: false}})
                  .then(post => {
                    post = post[0]
                    if (post) {
                      updateCommentsCount(verb, post._id)
                      sendReply(post, body)
                    }
                  })
                  .catch(err => {
                    logger.serverLog(TAG, `Failed to fetch post1 ${JSON.stringify(err)}`, 'error')
                  })
              }
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`, 'error')
            })
        }
      })
      .catch(err => {
        logger.serverLog(TAG, `Failed to fetch post ${JSON.stringify(err)}`, 'error')
      })
  }
}
function updateCommentsCount (verb, postId) {
  let newPayload = verb === 'add' ? { $inc: { count: 1 } } : { $inc: { count: -1 } }
  utility.callApi(`comment_capture/update`, 'put', {query: { _id: postId }, newPayload: newPayload, options: {}})
    .then(updated => {
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to update facebook post ${JSON.stringify(err)}`, 'error')
    })
}
function sendReply (post, body) {
  let send = true
  send = commentCaptureLogicLayer.getSendValue(post, body)
  if (send) {
    let messageData = {
      'recipient': {
        'comment_id': body.entry[0].changes[0].value.comment_id},
      'message': broadcastUtility.prepareMessageData(null, post.reply[0])
    }
    console.log('final messageData', JSON.stringify(messageData))
    needle.post(
      `https://graph.facebook.com/v5.0/me/messages?access_token=${post.pageId.accessToken}`,
      messageData, (err, resp) => {
        if (err) {
          logger.serverLog(TAG, err, 'error')
        } else if (resp.body.error) {
          sendOpAlert(resp.body.error, 'comment controller in kiboengage', post.pageId._id, post.pageId.companyId, post.userId._id)
        }
        console.log('response from privatereply', resp.body)
      })
    createSubscriber(post, body)
  }
}
function createSubscriber (post, body) {
  if ((post.secondReply.action === 'reply' && post.secondReply.payload && post.secondReply.payload.length > 0) ||
(post.secondReply.action === 'subscribe' && post.secondReply.sequenceId && post.secondReply.sequenceId !== '')) {
    let senderId = body.entry[0].changes[0].value.from.id
    utility.callApi(`subscribers/query`, 'post', {pageId: post.pageId._id, senderId: senderId})
      .then(subscriber => {
        subscriber = subscriber[0]
        if (!subscriber) {
          let payload = {
            companyId: post.companyId._id,
            senderId: senderId,
            pageId: post.pageId._id,
            isSubscribed: false,
            awaitingCommentReply: {sendSecondMessage: true, postId: post._id},
            completeInfo: false,
            source: 'comment_capture'
          }
          utility.callApi(`subscribers`, 'post', payload)
            .then(subscriberCreated => {
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to create subscriber ${JSON.stringify(err)}`, 'error')
            })
        } else {
          utility.callApi(`subscribers/update`, 'put', {query: {_id: subscriber._id}, newPayload: {awaitingCommentReply: {sendSecondMessage: true, postId: post._id}}, options: {}})
            .then(updated => {
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to udpate subscriber ${JSON.stringify(err)}`, 'error')
            })
        }
      })
      .catch(err => {
        logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(err)}`, 'error')
      })
  }
}
exports.sendSecondReplyToComment = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let subscriber = req.body.subscriber
  let post = req.body.post
  broadcastUtility.getBatchData(post.secondReply.payload, subscriber.senderId, req.body.page, messengerEventsUtility.sendBroadcast, subscriber.firstName, subscriber.lastName, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
  updateSubscriberAwaitingReply(subscriber._id)
}
function updateSubscriberAwaitingReply (subscriberId) {
  utility.callApi(`subscribers/update`, 'put', {query: {_id: subscriberId}, newPayload: {awaitingCommentReply: {sendSecondMessage: false}}, options: {}})
    .then(updated => {
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to udpate subscriber ${JSON.stringify(err)}`, 'error')
    })
}
