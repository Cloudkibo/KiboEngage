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
exports.edit = function (req, res) {
  let data = {
    feedId: req.body.feedId,
    body: req.body.updatedObject,
    companyId: req.user.companyId,
    userId: req.user._id
  }
  async.series([
    _fetchFeedToUpdate.bind(null, data),
    _validateFeedTitle.bind(null, data),
    _validateFeedUrl.bind(null, data),
    _validateTitleforEditFeed.bind(null, data),
    _checkDefaultFeed.bind(null, data),
    _updateRSSFeed.bind(null, data)
  ], function (err) {
    if (err) {
      sendErrorResponse(res, 500, err)
    } else {
      sendSuccessResponse(res, 200, data.update)
    }
  })
}

function _fetchFeedToUpdate (data, next) {
  DataLayer.genericFindForRssFeeds({_id: data.feedId})
  .then(rssFeeds => {
    if (rssFeeds[0]) {
      data.feed = rssFeeds[0]
      next(null)
    } else {
      next('Unable to fetch current feed')
    }
  })
  .catch(error => {
    next(error)
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
function _updateRSSFeed (data, next) {
  let dataToUpdate  = data.body
  DataLayer.genericUpdateRssFeed({_id: data.feedId}, dataToUpdate)
    .then(updated => {
      data.update = updated
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
    DataLayer.genericUpdateRssFeed({companyId: data.companyId, pageIds: data.body.pageIds[0], defaultFeed: true}, {defaultFeed: false}, {})
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
        pageIds: data.body.pageIds[0]}
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
    DataLayer.countDocuments({companyId: data.companyId, pageIds: data.body.pageIds[0], isActive: true})
      .then(rssFeeds => {
        if (rssFeeds.length > 0 && rssFeeds[0].count >= 13) {
          next(`Can not create more than 13 active Feeds for one news page at a time!`)
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
const _validateTitleforEditFeed = (data, next) => {
  if (data.body.title && data.body.title.toLowerCase().trim() === data.feed.title.toLowerCase().trim()) {
    next(null)
  } else {
    DataLayer.countDocuments({companyId: data.companyId, pageIds: data.body.pageIds[0], title: {$regex: '.*' + data.body.title + '.*', $options: 'i'}})
    .then(rssFeeds => {
      if (rssFeeds.length > 0) {
        next('An Rss feed with a similar title is already connected with this page')
      } else {
        next(null)
      }
    })
    .catch(error => {
      next(error)
    })
  }
}
const _validateActiveFeeds = (data, next) => {
  if (data.body.title) {
    DataLayer.countDocuments({companyId: data.companyId, pageIds: data.body.pageIds[0], title: {$regex: '.*' + data.body.title + '.*', $options: 'i'}})
      .then(rssFeeds => {
        if (rssFeeds.length > 0) {
          next('An Rss feed with a similar title is already connected with this page')
        } else {
          next(null)
        }
      })
      .catch(error => {
        next(error)
      })
  } else {
    next(null)
  }
}

const _validateFeedUrl = (data, next) => {
  if (data.body.feedUrl) {
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
  } else {
    next(null)
  }
}
exports.getRssFeedPosts = function (req, res) {
  let criterias = LogicLayer.getCriterias(req.body)
  async.parallelLimit([
    function (callback) {
      RssFeedPostsDataLayer.countDocuments(criterias.countCriteria[3].$match)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      RssFeedPostsDataLayer.aggregateForRssFeedPosts(criterias.finalCriteria[3].$match, criterias.finalCriteria[2].$group, criterias.finalCriteria[0].$lookup, criterias.finalCriteria[6].$limit, criterias.finalCriteria[4].$sort, criterias.finalCriteria[5].$skip, criterias.finalCriteria[1].$unwind)
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
