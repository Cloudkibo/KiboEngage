const logger = require('../../../components/logger')
const TAG = 'api/commentCapture/commentCapture.controller.js'
const utility = require('../utility/index.js')
const logicLayer = require('./commentCapture.logiclayer')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
let { sendOpAlert } = require('./../../global/operationalAlert')
const { facebookApiCaller } = require('../../global/facebookApiCaller')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      utility.callApi(`comment_capture/query`, 'post', {companyId: companyUser.companyId})
        .then(posts => {
          if (posts && posts.length > 0) {
            for (let i = 0; i < posts.length; i++) {
              posts[i].pageId = posts[i].pageId._id
              if (i === posts.length - 1) {
                sendSuccessResponse(res, 200, posts)
              }
            }
          } else {
            sendSuccessResponse(res, 200, [])
          }
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to get fetch posts ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.viewPost = function (req, res) {
  utility.callApi(`comment_capture/${req.params.id}`, 'get', {})
    .then(post => {
      sendSuccessResponse(res, 200, post)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch post ${JSON.stringify(error)}`)
    })
}

exports.create = function (req, res) {
  getPayloadToSave(req.user, req.body)
    .then(payloadToSave => {
      utility.callApi(`comment_capture`, 'post', payloadToSave)
        .then(postCreated => {
          sendSuccessResponse(res, 200, postCreated)
        })
        .catch((err) => {
          sendErrorResponse(res, 500, `Failed to save post ${err}`)
        })
    })
    .catch((err) => {
      sendErrorResponse(res, 500, `${err}`)
    })
}

function getPayloadToSave (user, body) {
  return new Promise(function (resolve, reject) {
    let payloadToSave = {
      title: body.title,
      pageId: body.pageId,
      companyId: user.companyId,
      userId: user._id,
      reply: body.reply,
      excludedKeywords: body.excludedKeywords,
      includedKeywords: body.includedKeywords
    }
    if (body.secondReply) {
      payloadToSave.secondReply = body.secondReply
    }
    if (body.captureOption === 'global') {
      utility.callApi(`comment_capture/query`, 'post', {companyId: user.companyId, pageId: body.pageId, post_id: {$exists: false}})
        .then(post => {
          post = post[0]
          if (post) reject(new Error('Cannot create another global post for this page'))
          else resolve(payloadToSave)
        })
        .catch((err) => {
          reject(err)
        })
    } else if (body.captureOption === 'existing') {
      getExistingPostId(body.existingPostUrl, body.pageId)
        .then(postId => {
          payloadToSave.post_id = postId
          resolve(payloadToSave)
        })
        .catch((err) => {
          reject(err)
        })
    } else if (body.captureOption === 'new') {
      postOnFacebook(body.payload, body.pageId)
        .then(postId => {
          payloadToSave.post_id = postId
          payloadToSave.payload = body.payload
          resolve(payloadToSave)
        })
        .catch((err) => {
          reject(err)
        })
    }
  })
}

function getExistingPostId (url, pageId) {
  return new Promise(function (resolve, reject) {
    let postId = logicLayer.getPostId(url)
    if (postId === '') {
      reject(new Error('Invalid URL'))
    } else {
      utility.callApi(`pages/${pageId}`, 'get', {})
        .then(page => {
          facebookApiCaller('v3.3', `${page.pageId}_${postId}?access_token=${page.accessToken}`, 'get', {})
            .then(response => {
              if (!response.body.error) {
                resolve(`${page.pageId}_${postId}`)
              } else {
                reject(new Error('Invalid URL'))
              }
            })
            .catch((err) => {
              reject(err)
            })
        })
        .catch((err) => {
          reject(err)
        })
    }
  })
}

function postOnFacebook (payload, pageId) {
  return new Promise(function (resolve, reject) {
    let payloadToPost = logicLayer.preparePayloadToPost(payload)
    utility.callApi(`pages/${pageId}`, 'get', {})
      .then(page => {
        if (payloadToPost.type === 'text') {
          facebookApiCaller('v3.3', `${page.pageId}/feed?access_token=${page.accessToken}`, 'post', payloadToPost.payload)
            .then(response => {
              if (response.body.error) {
                sendOpAlert(response.body.error, 'comment capture controller in kiboengage', page._id, page.userId, page.companyId)
                logger.serverLog(TAG, `Failed to post on facebook ${JSON.stringify(response.body.error)}`, 'error')
                reject(JSON.stringify(response.body.error))
              } else {
                resolve(response.body.post_id ? response.body.post_id : response.body.id)
                logger.serverLog(TAG, `Posted successfully on Facebook ${JSON.stringify(response.body)}`, 'debug')
              }
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to post on facebook ${err}`, 'error')
              reject(err)
            })
        } else if (payloadToPost.type === 'image') {
          facebookApiCaller('v3.3', `${page.pageId}/photos?access_token=${page.accessToken}`, 'post', payloadToPost.payload)
            .then(response => {
              if (response.body.error) {
                sendOpAlert(response.body.error, 'comment capture controller in kiboengage', page._id, page.userId, page.companyId)
                logger.serverLog(TAG, `Failed to post on facebook ${JSON.stringify(response.body.error)}`, 'error')
                reject(JSON.stringify(response.body.error))
              } else {
                logger.serverLog(TAG, `Posted successfully on Facebook ${JSON.stringify(response.body)}`, 'debug')
                resolve(response.body.post_id ? response.body.post_id : response.body.id)
              }
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to post on facebook ${err}`, 'error')
              reject(err)
            })
        } else if (payloadToPost.type === 'images') {
          facebookApiCaller('v3.3', `${page.pageId}/feed?access_token=${page.accessToken}`, 'post', payloadToPost.payload)
            .then(response => {
              if (response.body.error) {
                sendOpAlert(response.body.error, 'twitter controller in kiboengage', page._id, page.userId, page.companyId)
                logger.serverLog(TAG, `Failed to post on facebook ${JSON.stringify(response.body.error)}`, 'error')
                reject(JSON.stringify(response.body.error))
              } else {
                logger.serverLog(TAG, `Posted successfully on Facebook ${JSON.stringify(response.body)}`, 'debug')
                resolve(response.body.post_id ? response.body.post_id : response.body.id)
              }
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to post on facebook ${err}`, 'error')
              reject(err)
            })
        } else if (payloadToPost.type === 'video') {
          facebookApiCaller('v3.3', `${page.pageId}/videos?access_token=${page.accessToken}`, 'post', payloadToPost.payload)
            .then(response => {
              if (response.body.error) {
                sendOpAlert(response.body.error, 'twitter controller in kiboengage', page._id, page.userId, page.companyId)
                logger.serverLog(TAG, `Failed to post on facebook ${JSON.stringify(response.body.error)}`, 'error')
                reject(JSON.stringify(response.body.error))
              } else {
                logger.serverLog(TAG, `Posted successfully on Facebook ${JSON.stringify(response.body)}`, 'debug')
                resolve(response.body.post_id ? response.body.post_id : response.body.id)
              }
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to post on facebook ${err}`, 'error')
              reject(err)
            })
        }
      })
  })
}
exports.edit = function (req, res) {
  var updatePayload = {
    includedKeywords: req.body.includedKeywords,
    excludedKeywords: req.body.excludedKeywords,
    secondReply: req.body.secondReply,
    title: req.body.title
  }
  utility.callApi(`comment_capture/updateone`, 'put', { query: {_id: req.body.postId}, newPayload: updatePayload, options: {} })
    .then(result => {
      sendSuccessResponse(res, 200, result)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to update post ${JSON.stringify(error)}`)
    })
}
exports.delete = function (req, res) {
  utility.callApi(`comment_capture/${req.params.id}`, 'delete', {})
    .then(result => {
      sendSuccessResponse(res, 200, result)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to delete post ${JSON.stringify(error)}`)
    })
}
