const logger = require('../../../components/logger')
const DataLayer = require('./rssFeeds.datalayer')
const RssFeedPostsDataLayer = require('./rssFeedPosts.datalayer')
const LogicLayer = require('./rssFeeds.logiclayer')
const TAG = 'api/v1/rssFeeds/rssFeeds.controller.js'
const utility = require('../utility')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const feedparser = require('feedparser-promised')
const async = require('async')

exports.create = function (req, res) {
  let data = {
    body: req.body,
    companyId: req.user.companyId,
    userId: req.user._id
  }
  async.series([
    _validateFeedTitle.bind(null, data),
    _validateFeedUrl.bind(null, data),
    _validateActiveFeeds.bind(null, data),
    _getSubscriptionsCount.bind(null, data),
    _checkDefaultFeed.bind(null, data),
    _saveRSSFeed.bind(null, data)
  ], function (err) {
    if (err) {
      sendErrorResponse(res, 500, err)
    } else {
      sendSuccessResponse(res, 200, data.savedFeed)
    }
  })
}

function _saveRSSFeed (data, next) {
  let scheduledTime = new Date()
  scheduledTime.setDate(scheduledTime.getDate() + 1)
  scheduledTime.setHours(8)
  scheduledTime.setMinutes(0)
  scheduledTime.setMilliseconds(0)
  let dataToSave = {
    pageIds: data.body.pageIds,
    companyId: data.companyId,
    userId: data.userId,
    feedUrl: data.body.feedUrl,
    title: data.body.title,
    subscriptions: data.subscriptions,
    storiesCount: data.body.storiesCount,
    defaultFeed: data.body.defaultFeed,
    scheduledTime: scheduledTime,
    isActive: data.body.isActive
  }
  DataLayer.createForRssFeeds(dataToSave)
    .then(savedFeed => {
      data.savedFeed = savedFeed
      next(null)
    })
    .catch(error => {
      next(error)
    })
}
exports.fetchFeeds = function (req, res) {
  var fetchCriteria = LogicLayer.fetchFeedsCriteria(req.body, req.user.companyId)
  async.parallelLimit([
    function (callback) {
      DataLayer.countDocuments(fetchCriteria.countCriteria[0].$match)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let match = fetchCriteria.finalCriteria[0].$match
      let sort = fetchCriteria.finalCriteria[1].$sort
      let skip = fetchCriteria.finalCriteria[2].$skip
      let limit = fetchCriteria.finalCriteria[3].$limit
      DataLayer.aggregateForRssFeeds(match, null, null, limit, sort, skip)
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
      let rssFeeds = results[1]
      sendSuccessResponse(res, 200, {rssFeeds: rssFeeds, count: countResponse.length > 0 ? countResponse[0].count : 0})
    }
  })
}
exports.delete = function (req, res) {
  console.log('Kiboengage delete')
  DataLayer.deleteForRssFeeds({_id:req.params.id})
    .then(result => {
      sendSuccessResponse(res, 200, result)  
    })
    .catch(err => {
      sendErrorResponse(res, 500, `Failed to delete feed ${JSON.stringify(error)}`)
    })
}
function _checkDefaultFeed (data, next) {
  if (data.body.defaultFeed) {
    DataLayer.genericUpdateRssFeed({companyId: data.companyId, defaultFeed: true}, {defaultFeed: false}, {})
      .then(updated => {
        next(null, data)
      })
      .catch(err => {
        logger.serverLog(TAG, `Failed to update default values ${err}`)
        next(err)
      })
  } else {
    next(null)
  }
}

function _getSubscriptionsCount (data, next) {
  if (data.body.defaultFeed) {
    let criteria = [
      {$match: {
        companyId: data.companyId,
        isSubscribed: true,
        completeInfo: true,
        pageId: {$in: data.body.pageIds}}
      },
      {$group: {_id: null, count: {$sum: 1}}}
    ]
    utility.callApi(`subscribers/aggregate`, 'post', criteria)
      .then(result => {
        if (result.length > 0) {
          data.subscriptions = result[0].count
          next(null, data)
        } else {
          next(null, data)
        }
      })
      .catch(err => {
        logger.serverLog(TAG, `Failed to fecth subscribers ${err}`)
        next(null, data)
      })
  } else {
    data.subscriptions = 0
    next(null, data)
  }
}

const _validateFeedTitle = (data, next) => {
  if (data.body.isActive) {
    DataLayer.countDocuments({companyId: data.companyId, isActive: true})
      .then(rssFeeds => {
        if (rssFeeds.length > 0 && rssFeeds[0].count >= 14) {
          next(`Can not create more than 14 active Feeds at a time!`)
        } else {
          next(null)
        }
      })
      .catch(error => {
        next(`Failed to fetch RSS Feeds ${error}`)
      })
  } else {
    next(null)
  }
}
const _validateActiveFeeds = (data, next) => {
  DataLayer.countDocuments({companyId: data.companyId, title: {$regex: '.*' + data.body.title + '.*', $options: 'i'}})
    .then(rssFeeds => {
      if (rssFeeds.length > 0) {
        next('Can not create more RSS Feeds with the same Title')
      } else {
        next(null)
      }
    })
    .catch(error => {
      next(error)
    })
}
const _validateFeedUrl = (data, next) => {
  feedparser.parse(data.body.feedUrl)
    .then(feed => {
      if (feed) {
        next(null)
      } else {
        next(`Invalid Feed URL provided`)
      }
    })
    .catch((err) => {
      logger.serverLog(TAG, `Invalid Feed URL provided ${err}`)
      next(`Invalid Feed URL provided`)
    })
}
exports.getRssFeedPosts = function (req, res) {
  let criterias = LogicLayer.getCriterias(req.body)
  async.parallelLimit([
    function (callback) {
      RssFeedPostsDataLayer.countDocuments(criterias[0].$match)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      RssFeedPostsDataLayer.aggregateForRssFeedPosts(criterias[0].$match, null, null, criterias[3].$limit, criterias[1].$sort, criterias[2].$skip)
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
      let posts = results[1]
      sendSuccessResponse(res, 200, {rssFeedPosts: posts, count: countResponse.length > 0 ? countResponse[0].count : 0})
    }
  })
}
