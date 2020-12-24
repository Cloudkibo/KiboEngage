const logger = require('../../../components/logger')
const DataLayer = require('./newsSections.datalayer')
const RssFeedPostsDataLayer = require('./newsPosts.datalayer')
const RssSubscriptionsDataLayer = require('./newsSubscriptions.datalayer')
const LogicLayer = require('./newsSections.logiclayer')
const TAG = 'api/v1/newsSections/newsSections.controller.js'
const utility = require('../utility')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const feedparser = require('feedparser-promised')
const PageAdminSubscriptionDataLayer = require('../pageadminsubscriptions/pageadminsubscriptions.datalayer')
const async = require('async')
const { updateCompanyUsage } = require('../../global/billingPricing')

exports.create = function (req, res) {
  utility.callApi(`featureUsage/planQuery`, 'post', {planId: req.user.currentPlan})
    .then(planUsage => {
      planUsage = planUsage[0]
      utility.callApi(`featureUsage/companyQuery`, 'post', {companyId: req.user.companyId})
        .then(companyUsage => {
          companyUsage = companyUsage[0]
          if (planUsage.news_integration_feeds !== -1 && companyUsage.news_integration_feeds >= planUsage.news_integration_feeds) {
            return res.status(500).json({
              status: 'failed',
              description: `Your news integration feeds limit has reached. Please upgrade your plan to create more feeds.`
            })
          } else {
            let data = {
              body: req.body,
              companyId: req.user.companyId,
              userId: req.user._id
            }
            async.series([
              _validateActiveFeeds.bind(null, data),
              _validateFeedUrl.bind(null, data),
              _validateFeedTitle.bind(null, data),
              _getSubscriptionsCount.bind(null, data),
              _checkDefaultFeed.bind(null, data),
              _saveRSSFeed.bind(null, data)
            ], function (err) {
              if (err) {
                sendErrorResponse(res, 500, err)
              } else {
                updateCompanyUsage(
                  req.user.companyId,
                  req.body.integrationType === 'rss' ? 'rss_feeds' : 'news_integration_feeds',
                  1
                )
                sendSuccessResponse(res, 200, data.savedFeed)
              }
            })
          }
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch company usage ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company usage ${JSON.stringify(err)}`)
    })
}
exports.preview = function (req, res) {
  let data = {
    body: req.body,
    companyId: req.user.companyId,
    userId: req.user._id
  }
  if (req.body.feedId) {
    data.feedId = req.body.feedId
  }
  if (req.body.integrationType === 'rss') {
    async.series([
      _validateFeedUrl.bind(null, data),
      _validateFeedTitle.bind(null, data),
      _parseFeed.bind(null, data),
      _fetchPage.bind(null, data),
      _fetchAdminSubscription.bind(null, data),
      _fetchRssFeeds.bind(null, data),
      _prepareMessageData.bind(null, data),
      _prepareBatch.bind(null, data),
      _sendPreviewMessage.bind(null, data)
    ], function (err) {
      if (err) {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.preview`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 500, err)
      } else {
        sendSuccessResponse(res, 200, data.sentResponse)
      }
    })
  } else if (req.body.integrationType === 'manual') {
    async.series([
      _validateFeedTitle.bind(null, data),
      _fetchPage.bind(null, data),
      _fetchAdminSubscription.bind(null, data),
      _fetchRssFeeds.bind(null, data),
      _prepareMessageData.bind(null, data),
      _prepareBatch.bind(null, data),
      _sendPreviewMessage.bind(null, data)
    ], function (err) {
      if (err) {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.preview`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 500, err)
      } else {
        sendSuccessResponse(res, 200, data.sentResponse)
      }
    })
  }
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
    _validateActiveFeeds.bind(null, data),
    _validateFeedUrl.bind(null, data),
    _validateFeedTitle.bind(null, data),
    _checkDefaultFeed.bind(null, data),
    _updateSubscriptionCount.bind(null, data),
    _updateRSSFeed.bind(null, data)
  ], function (err) {
    if (err) {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.edit`, req.body, {user: req.user}, 'error')
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
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _fetchFeedToUpdate`, data, {}, 'error')
      next(error)
    })
}
function _updateSubscriptionCount (data, next) {
  if (data.body.defaultFeed !== data.feed.defaultFeed) {
    if (data.body.defaultFeed) {
      let criteria = [
        {$match: {
          companyId: data.feed.companyId,
          isSubscribed: true,
          completeInfo: true,
          pageId: data.feed.pageIds[0]}
        },
        {$group: {_id: '$_id', count: {$sum: 1}}}
      ]
      utility.callApi(`subscribers/aggregate`, 'post', criteria)
        .then(result => {
          if (result.length > 0) {
            RssSubscriptionsDataLayer.aggregateForRssSubscriptions({newsSectionId: data.feed._id, subscription: false}, { _id: null, count: { $sum: 1 } })
              .then(rssSubscriptions => {
                if (rssSubscriptions.length > 0) {
                  data.body.subscriptions = result.length - rssSubscriptions[0].count
                } else {
                  data.body.subscriptions = result.length
                }
                next()
              })
              .catch(err => {
                const message = err || 'Internal Server Error'
                logger.serverLog(message, `${TAG}: _updateSubscriptionCount`, data, {}, 'error')
                next(err)
              })
          } else {
            data.body.subscriptions = 0
            next(null, data)
          }
        })
        .catch(err => {
          const message = err || 'Failed to fetch subscribers'
          logger.serverLog(message, `${TAG}: _updateSubscriptionCount`, data, {}, 'error')
          next(err)
        })
    } else {
      RssSubscriptionsDataLayer.aggregateForRssSubscriptions({newsSectionId: data.feed._id, subscription: true}, { _id: null, count: { $sum: 1 } })
        .then(rssSubscriptions => {
          data.body.subscriptions = rssSubscriptions.length > 0 ? rssSubscriptions[0].count : 0
          next()
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: _updateSubscriptionCount`, data, {}, 'error')
          next(err)
        })
    }
  } else {
    next()
  }
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
    title: data.body.title,
    subscriptions: data.subscriptions,
    defaultFeed: data.body.defaultFeed,
    scheduledTime: scheduledTime,
    isActive: data.body.isActive,
    integrationType: data.body.integrationType
  }
  if (data.body.integrationType === 'rss') {
    dataToSave.feedUrl = data.body.feedUrl
    dataToSave.storiesCount = data.body.storiesCount
  } else if (data.body.integrationType === 'manual') {
    dataToSave.stories = data.body.stories
  }
  DataLayer.createForRssFeeds(dataToSave)
    .then(savedFeed => {
      data.savedFeed = savedFeed
      next(null)
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _saveRSSFeed`, data, {}, 'error')
      next(error)
    })
}
function _updateRSSFeed (data, next) {
  let dataToUpdate = data.body
  DataLayer.genericUpdateRssFeed({_id: data.feedId}, dataToUpdate)
    .then(updated => {
      data.update = updated
      next(null)
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _updateRSSFeed`, data, {}, 'error')
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
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.fetchFeeds`, req.body, {user: req.user}, 'error')
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
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.fetchFeeds`, req.body, {user: req.user}, 'error')
          callback(err)
        })
    },
    function (callback) {
      DataLayer.genericFindForRssFeeds({companyId: req.user.companyId, integrationType: req.body.integrationType, defaultFeed: true})
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.fetchFeeds`, req.body, {user: req.user}, 'error')
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.fetchFeeds`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err)
    } else {
      let countResponse = results[0]
      let rssFeeds = results[1]
      let defaultFeeds = results[2]
      sendSuccessResponse(res, 200, {rssFeeds: rssFeeds, count: countResponse.length > 0 ? countResponse[0].count : 0, defaultFeeds: defaultFeeds})
    }
  })
}

exports.checkSMP = function (req, res) {
  if (req.user.SMPStatus) {
    sendSuccessResponse(res, 200, req.user.SMPStatus)
  } else {
    const message = 'Failed to fetch subscription messaging status'
    logger.serverLog(message, `${TAG}: exports.checkSMP`, req.body, {user: req.user}, 'error')
    sendErrorResponse(res, 500, `Failed to fetch subscription messaging status`)
  }
}

exports.delete = function (req, res) {
  DataLayer.genericFindForRssFeeds({_id: req.params.id})
    .then(result => {
      const feed = result[0]
      DataLayer.deleteForRssFeeds({_id: req.params.id})
        .then(result => {
          updateCompanyUsage(
            req.user.companyId,
            feed.integrationType === 'rss' ? 'rss_feeds' : 'news_integration_feeds',
            -1
          )
          sendSuccessResponse(res, 200, result)
        })
        .catch(err => {
          sendErrorResponse(res, 500, `Failed to delete feed ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.delete`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to delete feed ${JSON.stringify(err)}`)
    })
}
function _checkDefaultFeed (data, next) {
  let query = {companyId: data.companyId, pageIds: data.body.pageIds[0], defaultFeed: true, integrationType: data.body.integrationType}
  if (data.feedId) {
    query._id = {$ne: data.feedId}
  }
  if (data.body.defaultFeed) {
    DataLayer.genericFindForRssFeeds(query)
      .then(rssFeeds => {
        if (rssFeeds.length > 0) {
          rssFeeds = rssFeeds[0]
          RssSubscriptionsDataLayer.aggregateForRssSubscriptions({newsSectionId: rssFeeds._id, subscription: true}, { _id: null, count: { $sum: 1 } })
            .then(rssSubscriptions => {
              DataLayer.genericUpdateRssFeed({_id: rssFeeds._id}, {defaultFeed: false, subscriptions: rssSubscriptions.length > 0 ? rssSubscriptions[0].count : 0}, {})
                .then(updated => {
                  next(null, data)
                })
                .catch(err => {
                  const message = err || 'Failed to update default values'
                  logger.serverLog(message, `${TAG}: _checkDefaultFeed`, data, {}, 'error')
                  next(err)
                })
            })
            .catch(err => {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: _checkDefaultFeed`, data, {}, 'error')
              next(err)
            })
        } else {
          next()
        }
      })
      .catch(err => {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: _checkDefaultFeed`, data, {}, 'error')
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
        pageId: data.body.pageIds[0]}
      },
      {$group: {_id: null, count: {$sum: 1}}}
    ]
    utility.callApi(`subscribers/aggregate`, 'post', criteria)
      .then(result => {
        if (result.length > 0) {
          data.subscriptions = result[0].count
          next(null, data)
        } else {
          data.subscriptions = 0
          next(null, data)
        }
      })
      .catch(err => {
        const message = err || 'Failed to fetch subscribers'
        logger.serverLog(message, `${TAG}: _getSubscriptionsCount`, data, {}, 'error')
        next(err)
      })
  } else {
    data.subscriptions = 0
    next(null, data)
  }
}

const _validateActiveFeeds = (data, next) => {
  if (data.body.isActive) {
    DataLayer.countDocuments({companyId: data.companyId, pageIds: data.body.pageIds[0], isActive: true, integrationType: data.body.integrationType})
      .then(rssFeeds => {
        if (rssFeeds.length > 0 && rssFeeds[0].count >= 13) {
          next(`Can not create more than 13 active Feeds for one news page at a time!`)
        } else {
          next(null)
        }
      })
      .catch(error => {
        const message = error || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: _validateActiveFeeds`, data, {}, 'error')
        next(`Failed to fetch RSS Feeds ${error}`)
      })
  } else {
    next(null)
  }
}

const _validateFeedTitle = (data, next) => {
  if (data.body.title) {
    var query = {
      companyId: data.companyId,
      pageIds: data.body.pageIds[0],
      integrationType: data.body.integrationType,
      title: {$regex: `^${data.body.title}$`, $options: 'i'}
    }
    if (data.feedId) {
      query['_id'] = {$ne: data.feedId}
    }
    DataLayer.countDocuments(query)
      .then(rssFeeds => {
        if (rssFeeds.length > 0) {
          next('An Rss feed with a similar title is already connected with this page')
        } else {
          next(null)
        }
      })
      .catch(error => {
        const message = error || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: _validateFeedTitle`, data, {}, 'error')
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
        const message = err || 'Invalid Feed URL provided'
        logger.serverLog(message, `${TAG}: _validateFeedUrl`, data, {}, 'error')
        next(`Invalid Feed URL provided`)
      })
  } else {
    next(null)
  }
}
const _parseFeed = (data, next) => {
  feedparser.parse(data.body.feedUrl)
    .then(feed => {
      data.feed = feed
      next()
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _parseFeed`, data, {}, 'error')
      next(err)
    })
}
const _fetchPage = (data, next) => {
  utility.callApi(`pages/query`, 'post', {_id: data.body.pageIds[0]})
    .then(pages => {
      data.page = pages[0]
      next()
    })
    .catch((err) => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _fetchPage`, data, {}, 'error')
      next(err)
    })
}
const _fetchRssFeeds = (data, next) => {
  DataLayer.genericFindForRssFeeds({companyId: data.companyId,
    isActive: true,
    pageIds: {$in: [data.body.pageIds[0]]},
    integrationType: data.body.integrationType
  })
    .then(rssFeeds => {
      data.rssFeeds = rssFeeds
      next()
    })
    .catch((err) => {
      const message = err || 'Failed to save broadcast'
      logger.serverLog(message, `${TAG}: _fetchRssFeeds`, data, {}, 'error')
      next(err)
    })
}
const _fetchAdminSubscription = (data, next) => {
  PageAdminSubscriptionDataLayer.genericFind({companyId: data.companyId, pageId: data.body.pageIds[0], userId: data.userId})
    .then(subscriptionUser => {
      data.subscriptionUser = subscriptionUser[0]
      next()
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _fetchAdminSubscription`, data, {}, 'error')
      next(err)
    })
}
const _prepareMessageData = (data, next) => {
  var quickReplies = []
  if (data.rssFeeds.length > 0) {
    quickReplies.push({
      content_type: 'text',
      title: 'Show More Topics',
      payload: JSON.stringify([{action: 'show_more_topics', rssFeedId: '', type: data.body.integrationType}])
    })
  }
  LogicLayer.getMetaData(data.body.stories ? data.body.stories : data.feed, data.body, data.page)
    .then(gallery => {
      let messageData = [{
        text: `Here are your daily updates from ${data.body.title} News:`
      }, {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: gallery
          }
        }
      }]
      if (quickReplies.length > 0) {
        messageData[1]['quick_replies'] = quickReplies
      }
      data.messageData = messageData
      next()
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _prepareMessageData`, data, {}, 'error')
      next(err)
    })
}
const _prepareBatch = (data, next) => {
  LogicLayer.prepareBatchData(data.subscriptionUser, data.messageData)
    .then(batch => {
      data.batch = batch
      next()
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _prepareBatch`, data, {}, 'error')
      next(err)
    })
}

const _sendPreviewMessage = (data, next) => {
  LogicLayer.callBatchAPI(data.page, data.batch)
    .then(sentResponse => {
      data.sentResponse = sentResponse
      next()
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _sendPreviewMessage`, data, {}, 'error')
      next(err)
    })
}

exports.getRssFeedPosts = function (req, res) {
  let criterias = LogicLayer.getCriterias(req.body)
  async.parallelLimit([
    function (callback) {
      RssFeedPostsDataLayer.countDocuments(criterias.countCriteria[1].$match, criterias.countCriteria[0].$project)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.getRssFeedPosts`, req.body, {user: req.user}, 'error')
          callback(err)
        })
    },
    function (callback) {
      RssFeedPostsDataLayer.aggregateForRssFeedPosts(criterias.finalCriteria[4].$match, criterias.finalCriteria[2].$group, criterias.finalCriteria[0].$lookup, criterias.finalCriteria[7].$limit, criterias.finalCriteria[5].$sort, criterias.finalCriteria[6].$skip, criterias.finalCriteria[1].$unwind, criterias.finalCriteria[3].$project)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.getRssFeedPosts`, req.body, {user: req.user}, 'error')
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.getRssFeedPosts`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err)
    } else {
      let countResponse = results[0]
      let posts = results[1]
      sendSuccessResponse(res, 200, {rssFeedPosts: posts, count: countResponse.length > 0 ? countResponse[0].count : 0})
    }
  })
}
