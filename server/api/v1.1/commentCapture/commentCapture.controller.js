const logger = require('../../../components/logger')
const needle = require('needle')
const TAG = 'api/commentCapture/commentCapture.controller.js'
const utility = require('../utility/index.js')
const logicLayer = require('./commentCapture.logiclayer')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
let { sendOpAlert } = require('./../../global/operationalAlert')
const URL = require('url')
const { facebookApiCaller } = require('../../global/facebookApiCaller')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      utility.callApi(`comment_capture/query`, 'post', {companyId: companyUser.companyId})
        .then(posts => {
          sendSuccessResponse(res, 200, posts)
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
      // let messageData = logicLayer.setMessage(req.body.payload)
      postOnFacebook(body.payload, body.pageId)
        .then(postId => {
          payloadToSave.post_id = postId
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
    let postId = getPostId(url)
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
              } else {
                resolve(response.body.post_id ? response.body.post_id : response.body.id)
                logger.serverLog(TAG, `Posted successfully on Facebook ${JSON.stringify(response.body)}`, 'debug')
              }
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to post on facebook ${err}`, 'error')
            })
        } else if (payloadToPost.type === 'image') {
          facebookApiCaller('v3.3', `${page.pageId}/photos?access_token=${page.accessToken}`, 'post', payloadToPost.payload)
            .then(response => {
              if (response.body.error) {
                sendOpAlert(response.body.error, 'comment capture controller in kiboengage', page._id, page.userId, page.companyId)
                logger.serverLog(TAG, `Failed to post on facebook ${JSON.stringify(response.body.error)}`, 'error')
              } else {
                logger.serverLog(TAG, `Posted successfully on Facebook ${JSON.stringify(response.body)}`, 'debug')
                resolve(response.body.post_id ? response.body.post_id : response.body.id)
              }
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to post on facebook ${err}`, 'error')
            })
        } else if (payloadToPost.type === 'images') {
          facebookApiCaller('v3.3', `${page.pageId}/feed?access_token=${page.accessToken}`, 'post', payloadToPost.payload)
            .then(response => {
              if (response.body.error) {
                sendOpAlert(response.body.error, 'twitter controller in kiboengage', page._id, page.userId, page.companyId)
                logger.serverLog(TAG, `Failed to post on facebook ${JSON.stringify(response.body.error)}`, 'error')
              } else {
                logger.serverLog(TAG, `Posted successfully on Facebook ${JSON.stringify(response.body)}`, 'debug')
                resolve(response.body.post_id ? response.body.post_id : response.body.id)
              }
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to post on facebook ${err}`, 'error')
            })
        } else if (payloadToPost.type === 'video') {
          facebookApiCaller('v3.3', `${page.pageId}/videos?access_token=${page.accessToken}`, 'post', payloadToPost.payload)
            .then(response => {
              if (response.body.error) {
                sendOpAlert(response.body.error, 'twitter controller in kiboengage', page._id, page.userId, page.companyId)
                logger.serverLog(TAG, `Failed to post on facebook ${JSON.stringify(response.body.error)}`, 'error')
              } else {
                logger.serverLog(TAG, `Posted successfully on Facebook ${JSON.stringify(response.body)}`, 'debug')
                resolve(response.body.post_id ? response.body.post_id : response.body.id)
              }
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to post on facebook ${err}`, 'error')
            })
        }
      })
  })
}
exports.edit = function (req, res) {
  if (req.body.postText) {
    var postText = {
      message: req.body.postText
    }
    needle.post(
      `https://graph.facebook.com/v4.0/${req.body.pagePostId}?access_token=${req.body.pageAccessToken}`,
      postText, (err, resp) => {
        if (err) {
          logger.serverLog(TAG, err, 'error')
        }
      })
  }

  var updatePayload = {
    includedKeywords: req.body.includedKeywords,
    excludedKeywords: req.body.excludedKeywords
  }

  if (req.body.postText) {
    updatePayload.postText = req.body.postText
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

function getPostId (url) {
  let postId = ''
  let pathname
  let result = URL.parse(url)
  if (result.host === 'www.facebook.com' && result.query && result.pathname) {
    let query = result.query.split('&')
    if (query && query.length > 0) {
      for (let i = 0; i < query.length; i++) {
        if (query[i].includes('fbid=')) {
          postId = query[i].substring(query[i].indexOf('fbid=') + 5)
          break
        } else if (query[i].includes('v=')) {
          postId = query[i].substring(query[i].indexOf('v=') + 2)
          break
        } else {
          pathname = result.pathname.split('/')
          if (pathname[pathname.length - 1] !== '') {
            postId = pathname[pathname.length - 1]
            break
          } else {
            postId = pathname[pathname.length - 2]
            break
          }
        }
      }
    }
  }
  return postId
}
