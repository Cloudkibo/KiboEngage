const logger = require('../../../components/logger')
const TAG = 'api/facebookEvents/comment.controller.js'
const utility = require('../utility')

exports.handleLikeEvent = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let postId = req.body.entry[0].changes[0].value.post_id
  let verb = req.body.entry[0].changes[0].value.verb
  let updateData = {
    purpose: 'updateAll',
    match: {
      postId: postId
    },
    updated: verb === 'add' ? {$inc: { likes: 1 }} : {$inc: { likes: -1 }},
    options: {}
  }
  utility.callApi('autoposting_fb_post', 'put', updateData, 'kiboengage')
    .then(updated => {
      console.log(TAG, 'Likes count updated successfully!')
    })
    .catch(err => {
      const message = err || 'Failed to update likes count'
      logger.serverLog(message, `${TAG}: handleLikeEvent`, req.body, {user: req.user}, 'error')
    })
}
