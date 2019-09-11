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
 // logger.serverLog(TAG, `in comment capture ${JSON.stringify(req.body)}`, 'debug')
  let send = true
  let postId = req.body.entry[0].changes[0].value.post_id
  let verb = req.body.entry[0].changes[0].value.verb
  // comment_capture work
  utility.callApi(`comment_capture/query`, 'post', {post_id: postId})
    .then(post => {
      post = post[0]
      let newPayload = req.body.entry[0].changes[0].value.verb === 'add' ? { $inc: { count: 1 } } : { $inc: { count: -1 } }
      utility.callApi(`comment_capture/update`, 'put', {query: { post_id: postId }, newPayload: newPayload, options: {}})
        .then(updated => {
          if (post && post.pageId) {
            send = commentCaptureLogicLayer.getSendValue(post, req.body)
            logger.serverLog(TAG,
              `send value ${JSON.stringify(send)}`, 'debug')
            if (send) {
              needle.get(
                `https://graph.facebook.com/v2.10/${post.pageId.pageId}?fields=access_token&access_token=${post.userId.facebookInfo.fbToken}`,
                (err, resp) => {
                  if (err) {
                    logger.serverLog(TAG, `ERROR ${JSON.stringify(err)}`, 'error')
                  }
                  if (resp.body.error) {
                    sendOpAlert(resp.body.error, 'comment controller in kiboengage', '', req.user.companyId, req.user._id)
                  }
                  let messageData = { message: post.reply }
                  needle.post(
                    `https://graph.facebook.com/${req.body.entry[0].changes[0].value.comment_id}/private_replies?access_token=${resp.body.access_token}`,
                    messageData, (err, resp) => {
                      if (err) {
                        logger.serverLog(TAG, err, 'error')
                      }
                      if (resp.body.error) {
                        sendOpAlert(resp.body.error, 'comment controller in kiboengage', '', req.user.companyId, req.user._id)
                      }
                      logger.serverLog(TAG,
                        `response from comment on facebook 2 ${JSON.stringify(resp.body)}`)
                    })
                })
            }
          }
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to update facebook post ${JSON.stringify(err)}`, 'error')
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch facebook posts ${JSON.stringify(err)}`, 'error')
    })
  // increment comment count for tweet post
  let updateData = {
    purpose: 'updateAll',
    match: {
      postId: postId
    },
    updated: verb === 'add' ? {$inc: { comments: 1 }} : {$inc: { comments: -1 }},
    options: {}
  }
  console.log('updateData', updateData)
  utility.callApi('autoposting_fb_post', 'put', updateData, 'kiboengage')
    .then(updated => {
      console.log('comments updated successfully')
      //logger.serverLog(TAG, 'Likes count updated successfully!')
    })
    .catch(err => {
      console.log('comments not  updated', err)
      logger.serverLog(TAG, `Failed to update likes count ${err}`, 'error')
    })
}
