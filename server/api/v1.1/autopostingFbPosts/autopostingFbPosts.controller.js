const LogicLayer = require('./logiclayer')
const utility = require('../utility')
const async = require('async')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/autopostingFbPosts/autopostingFbPosts.controller.js'

exports.getPosts = function (req, res) {
  let countCriteria = LogicLayer.getCountCriteria(req)
  let matchCriteria = LogicLayer.getMatchCriteria(req)
  async.parallelLimit([
    function (callback) {
      utility.callApi('autoposting_fb_post/query', 'post', countCriteria, 'kiboengage')
        .then(countData => {
          callback(null, countData)
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.getPosts`, req.body, {user: req.user}, 'error')
          callback(err)
        })
    },
    function (callback) {
      utility.callApi('autoposting_fb_post/query', 'post', matchCriteria, 'kiboengage')
        .then(posts => {
          callback(null, posts)
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.getPosts`, req.body, {user: req.user}, 'error')
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.getPosts`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Failed to fetch facebook posts ${err}`)
    } else {
      let count = results[0].length > 0 ? results[0][0].count : 0
      let posts = results[1]
      populatePages(posts, req)
        .then(result => {
          sendSuccessResponse(res, 200, {posts: result.posts, count})
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.getPosts`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, '', `Failed to fetch facebook posts ${err}`)
        })
    }
  })
}

function populatePages (posts, req) {
  return new Promise(function (resolve, reject) {
    let sendPayload = []
    if (posts && posts.length > 0) {
      async.each(posts, function (post, next) {
        utility.callApi(`pages/query`, 'post', {_id: post.pageId, companyId: post.companyId})
          .then(pages => {
            post.pageId = pages[0]
            sendPayload.push(post)
            next()
          })
          .catch(err => {
            const message = err || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: populatePages`, req.body, {user: req.user}, 'error')
            next(err)
          })
      }, function (err) {
        if (err) {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: populatePages`, req.body, {user: req.user}, 'error')
          reject(err)
        } else {
          sendPayload = sendPayload.sort(function (a, b) {
            return new Date(b.datetime) - new Date(a.datetime)
          })
          resolve({posts: sendPayload})
        }
      })
    } else {
      resolve({posts: []})
    }
  })
}
