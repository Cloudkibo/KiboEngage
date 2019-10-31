const logger = require('../../../components/logger')
const TAG = 'api/facebookEvents/comment.controller.js'
const needle = require('needle')
const utility = require('../utility')
const commentCaptureLogicLayer = require('./commentCapture.logiclayer')
let { sendOpAlert } = require('./../../global/operationalAlert')

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
    let messageData = { message: post.reply }
    needle.post(
      `https://graph.facebook.com/${body.entry[0].changes[0].value.comment_id}/private_replies?access_token=${post.pageId.accessToken}`,
      messageData, (err, resp) => {
        if (err) {
          logger.serverLog(TAG, err, 'error')
        } else if (resp.body.error) {
          sendOpAlert(resp.body.error, 'comment controller in kiboengage', post.pageId._id, post.pageId.companyId, post.userId._id)
        }
      })
  }
}
