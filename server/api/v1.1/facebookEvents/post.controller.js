const logger = require('../../../components/logger')
const TAG = 'api/facebookEvents/post.controller.js'
const utility = require('../utility')

exports.handlePostEvent = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  //logger.serverLog(TAG, `in post controller ${JSON.stringify(req.body)}`, 'debug')
  let postId = req.body.entry[0].changes[0].value.post_id
  let verb = req.body.entry[0].changes[0].value.verb
  
if(verb === 'remove'){
  utility.callApi(`comment_capture/deleteLocally`, 'post', {post_id: postId})
  .then( res => {
    console.log(`Success: ${res}`)
  })
  .catch(err => {
    logger.serverLog(TAG, `Failed to delete post locally ${err}`, 'error')
  })
}
}
