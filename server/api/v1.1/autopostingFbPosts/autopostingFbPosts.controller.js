const LogicLayer = require('./logiclayer')
const utility = require('../utility')
const async = require('async')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

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
          callback(err)
        })
    },
    function (callback) {
      utility.callApi('autoposting_fb_post/query', 'post', matchCriteria, 'kiboengage')
        .then(posts => {
          callback(null, posts)
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      sendErrorResponse(res, 500, '', `Failed to fetch facebook posts ${err}`)
    } else {
      let count = results[0].length > 0 ? results[0][0].count : 0
      let posts = results[1]
      populatePages(posts, req)
        .then(result => {
          sendSuccessResponse(res, 200, {posts: result.posts, count})
        })
        .catch(err => {
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
            next(err)
          })
      }, function (err) {
        if (err) {
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
