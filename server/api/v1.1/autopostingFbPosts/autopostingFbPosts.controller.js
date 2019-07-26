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
      let count = results[0].length > 0 ? results[0].count : 0
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
      for (let i = 0; i < posts.length; i++) {
        utility.callApi(`pages/query`, 'post', {_id: posts[i].pageId, companyId: posts[i].companyId})
          .then(pages => {
            let post = posts[i]
            post.pageId = pages[0]
            sendPayload.push(post)
            if (sendPayload.length === (posts.length - 1)) {
              sendPayload.sort(function (a, b) {
                return new Date(b.datetime) - new Date(a.datetime)
              })
              resolve({posts: sendPayload})
            }
          })
          .catch(err => {
            reject(err)
          })
      }
    } else {
      resolve({posts: []})
    }
  })
}
