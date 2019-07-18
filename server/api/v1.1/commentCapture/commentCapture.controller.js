const logger = require('../../../components/logger')
const needle = require('needle')
const TAG = 'api/commentCapture/commentCapture.controller.js'
const utility = require('../utility/index.js')
const logicLayer = require('./commentCapture.logiclayer')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

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
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      utility.callApi(`comment_capture`, 'post', {
        pageId: req.body.pageId,
        companyId: companyUser.companyId,
        userId: req.user._id,
        reply: req.body.reply,
        payload: req.body.payload,
        excludedKeywords: req.body.excludedKeywords,
        includedKeywords: req.body.includedKeywords
      })
        .then(postCreated => {
          require('./../../../config/socketio').sendMessageToClient({
            room_id: companyUser.companyId,
            body: {
              action: 'post_created',
              payload: {
                poll_id: postCreated._id,
                user_id: req.user._id,
                user_name: req.user.name,
                company_id: companyUser.companyId
              }
            }
          })
          utility.callApi(`pages/${req.body.pageId}`, 'get', {})
            .then(page => {
              let currentUser
              if (req.user.facebookInfo) {
                currentUser = req.user
              } else {
                currentUser = page.userId
              }
              needle.get(
                `https://graph.facebook.com/v2.10/${page.pageId}?fields=access_token&access_token=${currentUser.facebookInfo.fbToken}`,
                (err, respp) => {
                  if (err) {
                    logger.serverLog(TAG,
                      `Page accesstoken from graph api Error${JSON.stringify(err)}`, 'error')
                  }
                  let messageData = logicLayer.setMessage(req.body.payload)
                  if (messageData.image) {
                    needle.post(
                      `https://graph.facebook.com/${page.pageId}/photos?access_token=${respp.body.access_token}`,
                      messageData, (err, resp) => {
                        if (err) {
                          logger.serverLog(TAG, err, 'error')
                        }
                        logger.serverLog(TAG, `response from post in image ${JSON.stringify(resp.body)}`)
                        if (resp.body && !resp.body.error) {
                          let postId = resp.body.post_id ? resp.body.post_id : resp.body.id
                          utility.callApi(`comment_capture/update`, 'put', {query: {_id: postCreated._id}, newPayload: {post_id: postId}, options: {}})
                            .then(result => {
                              sendSuccessResponse(res, 200, postCreated)
                            })
                            .catch(error => {
                              sendErrorResponse(res, 500, `Failed to create post ${JSON.stringify(error)}`)
                            })
                        } else {
                          sendErrorResponse(res, 500, '', resp.body)
                        }
                      })
                  } else if (messageData.video) {
                    needle.post(
                      `https://graph-video.facebook.com/v2.11/${page.pageId}/videos?access_token=${respp.body.access_token}`,
                      messageData, (err, resp) => {
                        if (err) {
                          logger.serverLog(TAG, err, 'error')
                        }
                        logger.serverLog(TAG, `response from post in video ${JSON.stringify(resp.body)}`)
                        needle.get(
                          `https://graph.facebook.com/${page.pageId}/feed?fields=object_id,type&access_token=${respp.body.access_token}`, (err, response) => {
                            if (err) {
                              logger.serverLog(TAG, err, 'error')
                            }
                            logger.serverLog(TAG, `response from feed ${JSON.stringify(response.body)}`)
                            logicLayer.getPostId(response.body.data, resp.body.id).then(postId => {
                              logger.serverLog(TAG, `postId ${postId}`, 'debug')
                              utility.callApi(`comment_capture/update`, 'put', {query: {_id: postCreated._id}, newPayload: {post_id: postId}, options: {}})
                                .then(result => {
                                  sendSuccessResponse(res, 200, postCreated)
                                })
                                .catch(error => {
                                  sendErrorResponse(res, 500, `Failed to create post ${JSON.stringify(error)}`)
                                })
                            })
                          })
                      })
                  } else {
                    needle.post(
                      `https://graph.facebook.com/${page.pageId}/feed?access_token=${page.accessToken}`,
                      messageData, (err, resp) => {
                        if (err) {
                          logger.serverLog(TAG, err, 'error')
                        }
                        if (resp.body && !resp.body.error) {
                          logger.serverLog(TAG, `response from post in image ${JSON.stringify(resp.body)}`)
                          let postId = resp.body.post_id ? resp.body.post_id : resp.body.id
                          utility.callApi(`comment_capture/update`, 'put', {query: {_id: postCreated._id}, newPayload: {post_id: postId}, options: {}})
                            .then(result => {
                              sendSuccessResponse(res, 200, postCreated)
                            })
                            .catch(error => {
                              sendErrorResponse(res, 500, `Failed to create post ${JSON.stringify(error)}`)
                            })
                        } else {
                          sendErrorResponse(res, 500, '', resp.body)
                        }
                      })
                  }
                })
            })
            .catch(error => {
              sendErrorResponse(res, 500, `Failed to fetch page ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to create post ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.edit = function (req, res) {
  utility.callApi(`comment_capture/update`, 'put', { query: {_id: req.body.postId}, newPayload: {includedKeywords: req.body.includedKeywords, excludedKeywords: req.body.excludedKeywords}, options: {} })
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
