const { facebookApiCaller } = require('../../global/facebookApiCaller')
const logger = require('../../../components/logger')
const TAG = 'api/facebookEvents/comment.logiclayer.js'

exports.getSendValue = function (post, body) {
  let send = true
  if (body.entry[0].changes[0].value.message) {
    if (post.includedKeywords && post.includedKeywords.length > 0) {
      send = false
      for (let i = 0; i < post.includedKeywords.length; i++) {
        if (body.entry[0].changes[0].value.message.toLowerCase().includes(post.includedKeywords[i].toLowerCase().trim())) {
          send = true
          break
        }
      }
    } else if (post.excludedKeywords && post.excludedKeywords.length > 0) {
      for (let i = 0; i < post.excludedKeywords.length; i++) {
        if (body.entry[0].changes[0].value.message.toLowerCase().includes(post.excludedKeywords[i].toLowerCase().trim())) {
          send = false
          break
        }
      }
    }
  }
  return send
}

exports.prepareCommentPayloadToSave = function (value, pageAccessToken) {
  return new Promise(function (resolve, reject) {
    let payload = []
    if (value.message && value.message !== '') {
      payload.push({componentType: 'text', text: value.message})
    }
    if (value.photo) {
      payload.push({componentType: 'image', url: value.photo})
    }
    if (value.video) {
      payload.push({componentType: 'video', url: value.video})
    }
    facebookApiCaller('v3.3', `${value.comment_id}?fields=attachment&access_token=${pageAccessToken}`, 'get', {})
      .then(response => {
        if (response.body.error) {
          resolve(payload)
        } else if (response.body && response.body.attachment && response.body.attachment.type) {
          if (response.body.attachment.type === 'animated_image_share') {
            payload.push({componentType: 'gif', url: response.body.attachment.url})
          }
          if (response.body.attachment.type === 'sticker') {
            payload.push({componentType: 'sticker', url: response.body.attachment.url})
          }
          resolve(payload)
        } else {
          resolve(payload)
        }
      })
      .catch(err => {
        const message = err || 'Failed to fetch comment attachment'
        logger.serverLog(message, `${TAG}: exports.prepareCommentPayloadToSave `, {value, pageAccessToken}, {}, 'error')
        resolve(payload)
      })
  })
}
