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
  if (verb === 'add') {
    newComment(postId, verb, body)
  } else if (verb === 'edited') {
    editComment(body)
  } else {
    deleteComment(body)
  }
}
function newComment (postId, verb, body) {
  let pageId = postId.split('_')[0]
  let parentId = body.entry[0].changes[0].value.parent_id
  utility.callApi(`comment_capture/query`, 'post', {post_id: postId})
    .then(post => {
      post = post[0]
      if (post) {
        updateCommentsCount(verb, post._id)
        if (parentId === postId) {
          sendReply(post, body)
        } else {
          saveComment(post, body, false)
        }
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
                    if (parentId === postId) {
                      sendReply(post, body)
                    } else {
                      saveComment(post, body, false)
                    }
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
function updatePositiveMatch (postId) {
  let newPayload = { $inc: { positiveMatchCount : 1 } }
  utility.callApi(`comment_capture/update`, 'put', {query: { _id: postId }, newPayload: newPayload, options: {}})
    .then(updated => {
      logger.serverLog(TAG, `Match count updated ${JSON.stringify(err)}`, 'updated')
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to update Positive Match Count ${JSON.stringify(err)}`, 'error')
    })
}
function updateCommentsCount (verb, postId, commentCountForPost) {
  let newPayload = verb === 'add' ? { $inc: { count: 1 } } : { $inc: { count: commentCountForPost ? commentCountForPost : -1 } }
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
  saveComment(post, body, send)
  if (send) {
    let messageData = {
      'recipient': {
        'comment_id': body.entry[0].changes[0].value.comment_id},
      'message': JSON.stringify(broadcastUtility.prepareMessageData(null, post.reply[0]))
    }
    needle.post(
      `https://graph.facebook.com/v5.0/me/messages?access_token=${post.pageId.accessToken}`,
      messageData, (err, resp) => {
        if (err) {
          logger.serverLog(TAG, err, 'error')
        } else if (resp.body.error) {
          sendOpAlert(resp.body.error, 'comment controller in kiboengage', post.pageId._id, post.pageId.companyId, post.userId._id)
        }
      })
    updatePositiveMatch(post._id)
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

function saveComment (post, body, send) {
  let value = body.entry[0].changes[0].value
  commentCaptureLogicLayer.prepareCommentPayloadToSave(value, post.pageId.accessToken)
    .then(commentPayload => {
      let commentToSave = {
        postId: post._id,
        commentFbId: value.comment_id,
        senderName: value.from.name,
        senderFbId: value.from.id,
        commentPayload: commentPayload,
        postFbLink: value.post.permalink_url,
        replySentOnMessenger: value.from.id === post.pageId.pageId ? false : send
      }
      checkParentOfComment(commentToSave, value)
        .then(commentToSave => {
          checkSubscriberOfComment(commentToSave, value, post)
            .then(result => {
              utility.callApi(`comment_capture/comments`, 'post', result)
                .then(commentSaved => {
                })
                .catch(err => {
                  logger.serverLog(TAG, `Failed to save comment ${JSON.stringify(err)}`, 'error')
                })
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to find susbcriber of comment ${JSON.stringify(err)}`, 'error')
            })
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch parent comment ${JSON.stringify(err)}`, 'error')
        })
    })
}

function editComment (body) {
  let value = body.entry[0].changes[0].value
  utility.callApi(`comment_capture/comments/query`, 'post', {commentFbId: value.comment_id})
    .then(comment => {
      comment = comment[0]
      if (comment) {
        utility.callApi(`pages/query`, 'post', {_id: comment.postId.pageId})
          .then(page => {
            page = page[0]
            if (page) {
              commentCaptureLogicLayer.prepareCommentPayloadToSave(value, page.accessToken)
                .then(commentPayload => {
                  utility.callApi(`comment_capture/comments/update`, 'put', {query: { _id: comment._id }, newPayload: {commentPayload: commentPayload}, options: {}})
                    .then(updated => {
                    })
                    .catch(err => {
                      logger.serverLog(TAG, `Failed to update comment ${JSON.stringify(err)}`, 'error')
                    })
                })
            }
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`, 'error')
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch comment ${JSON.stringify(err)}`, 'error')
    })
}

function deleteComment (body) {
  let value = body.entry[0].changes[0].value
  let commentCountForPost = -1
  utility.callApi(`comment_capture/comments/query`, 'post', {commentFbId: value.comment_id})
    .then(comment => {
      comment = comment[0]
      if (comment) {
        utility.callApi(`comment_capture/comments/delete`, 'post', {commentFbId: value.comment_id})
          .then(deleted => {
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`, 'error')
          })
        if (comment.childCommentCount > 0) {
          utility.callApi(`comment_capture/comments/delete`, 'post', {parentId: comment._id})
            .then(deleted => {
              commentCountForPost = commentCountForPost - deleted.deletedCount
              updateCommentsCount(value.verb, comment.postId, commentCountForPost)
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`, 'error')
            })
        } else {
          updateCommentsCount(value.verb, comment.postId, commentCountForPost)
        }
        if (comment.parentId) {
          utility.callApi(`comment_capture/comments/update`, 'put', {query: { _id: comment.parentId }, newPayload: { $inc: { childCommentCount: -1 } }, options: {}})
            .then(updated => {
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to update facebook post ${JSON.stringify(err)}`, 'error')
            })
        }
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch comment ${JSON.stringify(err)}`, 'error')
    })
}

function checkParentOfComment (commentToSave, value) {
  return new Promise(function (resolve, reject) {
    if (value.comment_id !== value.parent_id) {
      utility.callApi(`comment_capture/comments/query`, 'post', {commentFbId: value.parent_id})
        .then(commentFound => {
          commentFound = commentFound[0]
          if (commentFound) {
            commentToSave.parentId = commentFound._id
            utility.callApi(`comment_capture/comments/update`, 'put', {query: { _id: commentFound._id }, newPayload: { $inc: { childCommentCount: 1 } }, options: {}})
              .then(updated => {
              })
              .catch(err => {
                reject(err)
              })
            resolve(commentToSave)
          } else {
            resolve(commentToSave)
          }
        })
        .catch(err => {
          reject(err)
        })
    } else {
      resolve(commentToSave)
    }
  })
}

function checkSubscriberOfComment (commentToSave, value, post) {
  return new Promise(function (resolve, reject) {
    utility.callApi(`subscribers/query`, 'post', {pageId: post.pageId._id, senderId: value.from.id})
      .then(subscriber => {
        subscriber = subscriber[0]
        if (subscriber) {
          commentToSave.subscriberId = subscriber._id
          resolve(commentToSave)
        } else {
          resolve(commentToSave)
        }
      })
      .catch(err => {
        reject(err)
      })
  })
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
