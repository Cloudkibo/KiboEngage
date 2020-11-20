const logger = require('../../../components/logger')
const TAG = 'api/commentCapture/commentCapture.controller.js'
const utility = require('../utility/index.js')
const logicLayer = require('./commentCapture.logiclayer')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
let { sendOpAlert } = require('./../../global/operationalAlert')
const { facebookApiCaller } = require('../../global/facebookApiCaller')
const async = require('async')
const { updateCompanyUsage } = require('../../global/billingPricing')

exports.index = function (req, res) {
  let criteria = logicLayer.getCriterias(req.body, req.user.companyId)
  utility.callApi(`comment_capture/aggregate`, 'post', criteria.countCriteria)
    .then(count => {
      utility.callApi(`comment_capture/aggregate`, 'post', criteria.finalCriteria)
        .then(posts => {
          sendSuccessResponse(res, 200, {posts, count: count.length > 0 ? count[0].count : 0})
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch posts ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to get posts count ${JSON.stringify(error)}`)
    })
}

exports.viewPost = function (req, res) {
  utility.callApi(`comment_capture/${req.params.id}`, 'get', {})
    .then(post => {
      sendSuccessResponse(res, 200, post)
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.viewPost`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch post ${JSON.stringify(error)}`)
    })
}

exports.create = function (req, res) {
  utility.callApi(`featureUsage/planQuery`, 'post', {planId: req.user.currentPlan})
    .then(planUsage => {
      planUsage = planUsage[0]
      utility.callApi(`featureUsage/companyQuery`, 'post', {companyId: req.user.companyId})
        .then(companyUsage => {
          companyUsage = companyUsage[0]
          if (planUsage.comment_capture_rules !== -1 && companyUsage.comment_capture_rules >= planUsage.comment_capture_rules) {
            return res.status(500).json({
              status: 'failed',
              description: `Your comment capture rules limit has reached. Please upgrade your plan to create more rules.`
            })
          } else {
            getPayloadToSave(req.user, req.body)
              .then(payloadToSave => {
                utility.callApi(`comment_capture`, 'post', payloadToSave)
                  .then(postCreated => {
                    updateCompanyUsage(req.user.companyId, 'comment_capture_rules', 1)
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
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to company usage ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to plan usage ${JSON.stringify(error)}`)
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
      includedKeywords: body.includedKeywords,
      seeMoreLink: body.seeMoreLink,
      sendOnlyToNewSubscribers: body.sendOnlyToNewSubscribers
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
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: getPayloadToSave`, {body}, {user}, 'error')
          reject(err)
        })
    } else if (body.captureOption === 'existing') {
      getExistingPostId(body.existingPostUrl, body.pageId)
        .then(postId => {
          utility.callApi(`comment_capture/query`, 'post', {companyId: user.companyId, pageId: body.pageId, post_id: postId})
            .then(post => {
              if (post.length > 0) {
                reject(new Error('You can create only one comment capture rule for any Facebook post'))
              } else {
                payloadToSave.post_id = postId
                resolve(payloadToSave)
              }
            })
            .catch((err) => {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: getPayloadToSave`, {body}, {user}, 'error')
              reject(err)
            })
        })
        .catch((err) => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: getPayloadToSave`, {body}, {user}, 'error')
          reject(err)
        })
    } else if (body.captureOption === 'new') {
      postOnFacebook(body.payload, body.pageId, body.seeMoreLink)
        .then(postId => {
          payloadToSave.post_id = postId
          payloadToSave.payload = body.payload
          resolve(payloadToSave)
        })
        .catch((err) => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: getPayloadToSave`, {body}, {user}, 'error')
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
                const message = response.body.error || 'Internal Server Error'
                logger.serverLog(message, `${TAG}: getExistingPostId`, {url, pageId}, {}, 'error')
                if (response.body.error.message && response.body.error.message === 'Invalid parameter') {
                  reject(new Error('Either post doesn’t exist or it belongs to some other page'))
                } else {
                  reject(new Error('Post Not Found'))
                }
              }
            })
            .catch((err) => {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: getExistingPostId`, {url, pageId}, {}, 'error')
              reject(err)
            })
        })
        .catch((err) => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: getExistingPostId`, {url, pageId}, {}, 'error')
          reject(err)
        })
    }
  })
}

function postOnFacebook (payload, pageId, seeMoreLink) {
  return new Promise(function (resolve, reject) {
    let payloadToPost = logicLayer.preparePayloadToPost(payload, seeMoreLink)
    utility.callApi(`pages/${pageId}`, 'get', {})
      .then(page => {
        if (payloadToPost.type === 'text') {
          facebookApiCaller('v3.3', `${page.pageId}/feed?access_token=${page.accessToken}`, 'post', payloadToPost.payload)
            .then(response => {
              if (response.body.error) {
                const message = response.body.error || 'Failed to post on facebook'
                logger.serverLog(message, `${TAG}: postOnFacebook`, payload, {}, 'error')
                reject(JSON.stringify(response.body.error))
              } else {
                resolve(response.body.post_id ? response.body.post_id : response.body.id)
              }
            })
            .catch(err => {
              const message = err || 'Failed to post on facebook'
              logger.serverLog(message, `${TAG}: postOnFacebook`, payload, {}, 'error')
              reject(err)
            })
        } else if (payloadToPost.type === 'image') {
          facebookApiCaller('v3.3', `${page.pageId}/photos?access_token=${page.accessToken}`, 'post', payloadToPost.payload)
            .then(response => {
              if (response.body.error) {
                const message = response.body.error || 'Failed to post on facebook'
                logger.serverLog(message, `${TAG}: postOnFacebook`, payload, {}, 'error')
                reject(JSON.stringify(response.body.error))
              } else {
                resolve(response.body.post_id ? response.body.post_id : response.body.id)
              }
            })
            .catch(err => {
              const message = err || 'Failed to post on facebook'
              logger.serverLog(message, `${TAG}: postOnFacebook`, payload, {}, 'error')
              reject(err)
            })
        } else if (payloadToPost.type === 'images') {
          facebookApiCaller('v3.3', `${page.pageId}/feed?access_token=${page.accessToken}`, 'post', payloadToPost.payload)
            .then(response => {
              if (response.body.error) {
                const message = response.body.error || 'Failed to post on facebook'
                logger.serverLog(message, `${TAG}: postOnFacebook`, payload, {}, 'error')
                reject(JSON.stringify(response.body.error))
              } else {
                resolve(response.body.post_id ? response.body.post_id : response.body.id)
              }
            })
            .catch(err => {
              const message = err || 'Failed to post on facebook'
              logger.serverLog(message, `${TAG}: postOnFacebook`, payload, {}, 'error')
              reject(err)
            })
        } else if (payloadToPost.type === 'video') {
          facebookApiCaller('v3.3', `${page.pageId}/videos?access_token=${page.accessToken}`, 'post', payloadToPost.payload)
            .then(response => {
              if (response.body.error) {
                const message = response.body.error || 'Failed to post on facebook'
                logger.serverLog(message, `${TAG}: postOnFacebook`, payload, {}, 'error')
                reject(JSON.stringify(response.body.error))
              } else {
                resolve(response.body.post_id ? response.body.post_id : response.body.id)
              }
            })
            .catch(err => {
              const message = err || 'Failed to post on facebook'
              logger.serverLog(message, `${TAG}: postOnFacebook`, payload, {}, 'error')
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
    reply: req.body.reply,
    secondReply: req.body.secondReply,
    title: req.body.title,
    sendOnlyToNewSubscribers: req.body.sendOnlyToNewSubscribers
  }
  utility.callApi(`comment_capture/updateone`, 'put', { query: {_id: req.body.postId}, newPayload: updatePayload, options: {} })
    .then(result => {
      sendSuccessResponse(res, 200, result)
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.edit`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to update post ${JSON.stringify(error)}`)
    })
}
exports.delete = function (req, res) {
  utility.callApi(`comment_capture/${req.params.id}`, 'delete', {})
    .then(result => {
      updateCompanyUsage(req.user.companyId, 'comment_capture_rules', -1)
      sendSuccessResponse(res, 200, result)
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.delete`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to delete post ${JSON.stringify(error)}`)
    })
}

exports.postsAnalytics = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      var aggregateQuery = logicLayer.getAggregateQuery(companyUser.companyId)
      utility.callApi(`comment_capture/aggregate`, 'post', aggregateQuery)
        .then(analytics => {
          sendSuccessResponse(res, 200, analytics)
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.postsAnalytics`, req.body, {user: req.user}, 'error')
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
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.getComments`, req.body, {user: req.user}, 'error')
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
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.getComments`, req.body, {user: req.user}, 'error')
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.getComments`, req.body, {user: req.user}, 'error')
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
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.getRepliesToComment`, req.body, {user: req.user}, 'error')
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
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.getRepliesToComment`, req.body, {user: req.user}, 'error')
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
  utility.callApi('comment_capture/comments/query', 'post', {postId: req.body.postId})
    .then(comments => {
      sendSuccessResponse(res, 200, comments)
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.fetchAllComments`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err)
    })
}
exports.fetchPostData = function (req, res) {
  utility.callApi(`comment_capture/query`, 'post', {_id: req.params._id})
    .then(post => {
      post = post[0]
      var isVideoPost = false
      if (post.payload && post.payload.length > 0) {
        for (var i = 0; i < post.payload.length; i++) {
          if (post.payload[i].componentType === 'video') {
            isVideoPost = true
            break
          }
        }
      }
      if (isVideoPost) {
        facebookApiCaller('v3.3', `${post.post_id}?fields=description,created_time&access_token=${post.pageId.accessToken}`, 'get', {})
          .then(response => {
            if (response.body.error) {
              sendErrorResponse(res, 500, `Failed to fetch post data from fb ${JSON.stringify(response.body.error)}`)
            } else {
              let dataToSend = {
                attachments: true,
                message: response.body.description ? response.body.description : '',
                datetime: response.body.created_time,
                postLink: `https://www.facebook.com/${post.post_id}`
              }
              sendSuccessResponse(res, 200, dataToSend)
            }
          })
          .catch((err) => {
            const message = err || 'Failed to save broadcast'
            logger.serverLog(message, `${TAG}: exports.fetchPostData`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 500, `Failed to fetch post data from fb ${JSON.stringify(err)}`)
          })
      } else {
        facebookApiCaller('v3.3', `${post.post_id}?fields=message,attachments.limit(1){type},created_time&access_token=${post.pageId.accessToken}`, 'get', {})
          .then(response => {
            if (response.body.error) {
              sendErrorResponse(res, 500, `Failed to fetch post data from fb ${JSON.stringify(response.body.error)}`)
            } else {
              let dataToSend = {
                attachments: !!response.body.attachments,
                message: response.body.message ? response.body.message : '',
                datetime: response.body.created_time,
                postLink: `https://www.facebook.com/${post.post_id}`
              }
              sendSuccessResponse(res, 200, dataToSend)
            }
          })
          .catch((err) => {
            const message = err || 'Failed to save broadcast'
            logger.serverLog(message, `${TAG}: exports.fetchPostData`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 500, `Failed to fetch post data from fb ${JSON.stringify(err)}`)
          })
      }
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.fetchPostData`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to get posts ${JSON.stringify(error)}`)
    })
}
exports.fetchGlobalPostData = function (req, res) {
  utility.callApi(`pages/query`, 'post', {_id: req.body.pageId})
    .then(page => {
      page = page[0]
      let paginiationQuery = req.body.after && req.body.after !== '' ? `&after=${req.body.after}` : undefined
      facebookApiCaller('v3.3', `${page.pageId}/posts?fields=attachments.limit(1){type},message,created_time&limit=${req.body.number_of_records}&pretty=0${paginiationQuery}&access_token=${page.accessToken}`, 'get', {})
        .then(response => {
          if (response.body.error) {
            const message = response.body.error || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: exports.fetchGlobalPostData`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 500, `Failed to fetch post data from fb ${JSON.stringify(response.body.error)}`)
          } else {
            if (response.body.data && response.body.data.length > 0) {
              sendGlobalDataPayload(response.body)
                .then(result => {
                  sendSuccessResponse(res, 200, result)
                })
            } else {
              sendSuccessResponse(res, 200, {posts: [], after: ''})
            }
          }
        })
        .catch((err) => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.fetchGlobalPostData`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch post data from fb ${JSON.stringify(err)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.fetchGlobalPostData`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to get posts ${JSON.stringify(error)}`)
    })
}

function sendGlobalDataPayload (responseBody) {
  return new Promise(function (resolve, reject) {
    let data = responseBody.data
    let dataToSend = []
    for (let i = 0; i < data.length; i++) {
      utility.callApi('comment_capture/query', 'post', {post_id: data[i].id})
        .then(post => {
          console.log('POST', post)
          if (!(post.length > 0)) {
            let aggregateData = [
              { $match: {postFbId: data[i].id, parentId: {$exists: false}} },
              { $group: {_id: null, count: { $sum: 1 }} }
            ]
            utility.callApi('comment_capture/comments/aggregate', 'post', aggregateData)
              .then(commentsCount => {
                commentsCount = commentsCount.length > 0 ? commentsCount[0].count : 0
                dataToSend.push({
                  postId: data[i].id,
                  commentsCount: commentsCount,
                  message: data[i].message ? data[i].message : '',
                  attachments: !!data[i].attachments,
                  datetime: data[i].created_time
                })
                if (i === data.length - 1) {
                  resolve({posts: dataToSend, after: responseBody.paging && responseBody.paging.next && responseBody.paging.cursors && responseBody.paging.cursors.after ? responseBody.paging.cursors.after : ''})
                }
              })
              .catch(err => {
                const message = err || 'Internal Server Error'
                logger.serverLog(message, `${TAG}: exports.fetchGlobalPostData`, responseBody, {}, 'error')
                reject(err)
              })
          }
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.fetchGlobalPostData`, responseBody, {}, 'error')
          reject(err)
        })
    }
  })
}
exports.filterComments = function (req, res) {
  let criteria = logicLayer.getCriteriasToFilterComments(req.body)
  async.parallelLimit([
    function (callback) {
      utility.callApi('comment_capture/comments/aggregate', 'post', criteria.countQuery)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.filterComments`, req.body, {user: req.user}, 'error')
          callback(err)
        })
    },
    function (callback) {
      utility.callApi('comment_capture/comments/aggregate', 'post', criteria.aggregateQuery)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.filterComments`, req.body, {user: req.user}, 'error')
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.filterComments`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err)
    } else {
      let countResponse = results[0]
      let comments = results[1]
      sendSuccessResponse(res, 200, {comments: comments, count: countResponse.length > 0 ? countResponse[0].count : 0})
    }
  })
}
