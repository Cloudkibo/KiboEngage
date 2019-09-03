const logger = require('../../../components/logger')
const TAG = 'api/facebookEvents/post.controller.js'
const utility = require('../utility')
var fs = require('fs')
var https = require('https')

exports.handlePostEvent = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let postId = req.body.entry[0].changes[0].value.post_id
  let verb = req.body.entry[0].changes[0].value.verb

  if (verb === 'remove') {
    utility.callApi(`comment_capture/deleteLocally`, 'post', {post_id: postId})
      .then(res => {
        console.log(`Success: ${res}`)
      })
      .catch(err => {
        logger.serverLog(TAG, `Failed to delete post locally ${err}`, 'error')
      })
  }
  if (verb === 'edited') {
    utility.callApi(`comment_capture/query`, 'post', {post_id: postId})
      .then(post => {
        post = post[0]
        if (post) {
          if (req.body.entry[0].changes[0].value.photos) {
            utility.callApi(`comment_capture/upload`, 'post', {url: req.body.entry[0].changes[0].value.photos[0]})
              .then(response => {
                editPost(req.body, response)
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to delete post locally ${err}`, 'error')
              })
          } else {
            editPost(req.body)
          }
        }
      })
      .catch(err => {
        logger.serverLog(TAG, `Failed to delete post locally ${err}`, 'error')
      })
  }
}

function editPost (body, payload) {
  let newPayload = []
  if (body.entry[0].changes[0].value.message) {
    newPayload.push({componentType: 'text', text: body.entry[0].changes[0].value.message})
  }
  if (body.entry[0].changes[0].value.photos) {
    newPayload.push({url: payload.url, id: payload.id, componentType: 'image'})
  }
  let updatePayload = {
    query: { post_id: body.entry[0].changes[0].value.post_id },
    newPayload: { payload: newPayload },
    options: {}
  }
  utility.callApi(`comment_capture/update`, 'put', updatePayload)
    .then(res => {
      console.log(`Success: ${res}`)
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to delete post locally ${err}`, 'error')
    })
}
