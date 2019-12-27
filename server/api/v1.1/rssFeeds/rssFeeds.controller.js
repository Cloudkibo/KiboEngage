const logger = require('../../../components/logger')
const DataLayer = require('./rssFeeds.datalayer')
const LogicLayer = require('./rssFeeds.logiclayer')
const TAG = 'api/v1/rssFeeds/rssFeeds.controller.js'
const utility = require('../utility')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.create = function (req, res) {
  if (req.body.isActive) {
    DataLayer.countDocuments({companyId: req.user.companyId, isActive: true})
      .then(rssFeeds => {
        if (rssFeeds.length > 0 && rssFeeds[0].count >= 13) {
          sendErrorResponse(res, 500, `Can not create more than 13 active Feeds at a time!`)
        } else {
          saveRSSFeed(req.body, req.user._id, req.user.companyId, res)
        }
      })
      .catch(error => {
        sendErrorResponse(res, 500, `Failed to fetch RSS Feeds ${JSON.stringify(error)}`)
      })
  } else {
    saveRSSFeed(req.body, req.user._id, req.user.companyId, res)
  }
}

function saveRSSFeed (body, userId, companyId, res) {
  getSubscriptionsCount(body.pageIds, companyId)
    .then(subscriptions => {
      let scheduledTime = new Date()
      scheduledTime.setDate(scheduledTime.getDate() + 1)
      scheduledTime.setHours(8)
      scheduledTime.setMinutes(0)
      scheduledTime.setMilliseconds(0)
      let data = {
        pageIds: body.pageIds,
        companyId: companyId,
        userId: userId,
        feedUrl: body.feedUrl,
        title: body.title,
        subscriptions: subscriptions,
        storiesCount: body.storiesCount,
        defaultFeed: body.defaultFeed,
        scheduledTime: scheduledTime,
        isActive: body.isActive
      }
      DataLayer.createForRssFeeds(data)
        .then(savedFeed => {
          checkDefaultFeed(body, companyId, savedFeed._id)
          sendSuccessResponse(res, 200, savedFeed)
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch RSS Feeds ${JSON.stringify(error)}`)
        })
    })
}

function checkDefaultFeed (body, companyId, rssFeedId) {
  if (body.defaultFeed) {
    DataLayer.genericUpdateRssFeed({companyId: companyId, defaultFeed: true, _id: {$ne: rssFeedId}}, {defaultFeed: false}, {})
      .then(updated => {
      })
      .catch(err => {
        logger.serverLog(TAG, `Failed to update default values ${err}`)
      })
  }
}

function getSubscriptionsCount (pageIds, companyId) {
  return new Promise(function (resolve, reject) {
    let criteria = [
      {$match: {
        companyId: companyId,
        isSubscribed: true,
        completeInfo: true,
        pageId: {$in: pageIds}}
      },
      {$group: {_id: null, count: {$sum: 1}}}
    ]
    utility.callApi(`subscribers/aggregate`, 'post', criteria)
      .then(result => {
        if (result.length > 0) {
          resolve(result[0].count)
        } else {
          resolve(0)
        }
      })
      .catch(err => {
        logger.serverLog(TAG, `Failed to fecth subscribers ${err}`)
        resolve(0)
      })
  })
}
