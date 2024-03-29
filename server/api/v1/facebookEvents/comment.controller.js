const logger = require('../../../components/logger')
const TAG = 'api/facebookEvents/comment.controller.js'
const needle = require('needle')
const utility = require('../utility')
const commentCaptureLogicLayer = require('./commentCapture.logiclayer')
const { sendOpAlert } = require('./../../global/operationalAlert')

exports.sendCommentReply = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  logger.serverLog(TAG, `in comment capture ${JSON.stringify(req.body)}`)
  let send = true
  let postId = req.body.entry[0].changes[0].value.post_id
  utility.callApi(`comment_capture/${postId}`)
    .then(post => {
      utility.callApi(`comment_capture/update`, 'put', {query: { post_id: postId }, newPayload: { $inc: { count: 1 } }, options: {}})
        .then(updated => {
          if (post && post.pageId) {
            send = commentCaptureLogicLayer.getSendValue(post, req.body)
            logger.serverLog(TAG,
              `send value ${JSON.stringify(send)}`)
            if (send) {
              needle.get(
                `https://graph.facebook.com/v6.0/${post.pageId.pageId}?fields=access_token&access_token=${post.userId.facebookInfo.fbToken}`,
                (err, resp) => {
                  if (err) {
                    logger.serverLog(TAG, `ERROR ${JSON.stringify(err)}`)
                  }
                  if (resp.body.error) {
                    sendOpAlert(resp.body.error, 'comment controller')
                  }
                  let messageData = { message: post.reply }
                  needle.post(
                    `https://graph.facebook.com/${req.body.entry[0].changes[0].value.comment_id}/private_replies?access_token=${resp.body.access_token}`,
                    messageData, (err, resp) => {
                      if (err) {
                        logger.serverLog(TAG, err)
                      }
                      if (resp.body.error) {
                        sendOpAlert(resp.body.error, 'comment controller')
                      }
                      logger.serverLog(TAG,
                        `response from comment on facebook 2 ${JSON.stringify(resp.body)}`)
                    })
                })
            }
          }
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to update facebook post ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch facebook posts ${JSON.stringify(err)}`)
    })
}
