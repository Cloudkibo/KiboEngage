const logger = require('../../../components/logger')
const TAG = 'api/commentCapture/commentCapture.controller.js'
const utility = require('../utility/index.js')
const logicLayer = require('./commentCapture.logiclayer')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
let { sendOpAlert } = require('./../../global/operationalAlert')
const { facebookApiCaller } = require('../../global/facebookApiCaller')
const async = require('async')
const mongoose = require('mongoose')

exports.index = function (req, res) {
  let criteria = logicLayer.getCriterias(req.body, req.user.companyId)
  utility.callApi(`comment_capture/aggregate`, 'post', criteria.countCriteria)
    .then(count => {
      utility.callApi(`comment_capture/aggregate`, 'post', criteria.finalCriteria)
        .then(posts => {
          sendSuccessResponse(res, 200, {posts, count: count.length > 0 ? count[0].count : 0})
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch posts ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to get posts count ${JSON.stringify(error)}`)
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

exports.postsAnalytics = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      var aggregateQuery = logicLayer.getAggregateQuery(companyUser.companyId)
      utility.callApi(`comment_capture/aggregate`, 'post', aggregateQuery)
        .then(analytics => {
          logger.serverLog(TAG, `Analytics ${JSON.stringify(analytics)}`, 'success')
          sendSuccessResponse(res, 200, analytics)
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to get fetch posts ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.getComments = function (req, res) {
  async.parallelLimit([
    function (callback) {
      let data = logicLayer.getCountForComments(req.body)
      utility.callApi('comment_capture/comments/aggregate', 'post', data)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let data = logicLayer.getComments(req.body)
      utility.callApi('comment_capture/comments/aggregate', 'post', data)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      sendErrorResponse(res, 500, err)
    } else {
      let countResponse = results[0]
      let comments = results[1]
      sendSuccessResponse(res, 200, {comments: comments, count: countResponse.length > 0 ? countResponse[0].count : 0})
    }
  })
}
exports.getRepliesToComment = function (req, res) {
  async.parallelLimit([
    function (callback) {
      let data = logicLayer.getCountForReplies(req.body)
      utility.callApi('comment_capture/comments/aggregate', 'post', data)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let data = logicLayer.getReplies(req.body)
      utility.callApi('comment_capture/comments/aggregate', 'post', data)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      sendErrorResponse(res, 500, err)
    } else {
      let countResponse = results[0]
      let comments = results[1]
      sendSuccessResponse(res, 200, {replies: comments, count: countResponse.length > 0 ? countResponse[0].count : 0})
    }
  })
}
exports.fetchAllComments = function (req, res) {
  utility.callApi('comment_capture/comments/query', 'post', {postId:  mongoose.Types.ObjectId(req.body.postId), })    
    .then(comments => {
      sendSuccessResponse(res, 200, comments)
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}
