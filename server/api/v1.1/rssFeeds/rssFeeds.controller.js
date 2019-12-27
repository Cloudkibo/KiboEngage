const logger = require('../../../components/logger')
const DataLayer = require('./rssFeeds.datalayer')
const LogicLayer = require('./rssFeeds.logiclayer')
const TAG = 'api/v1/rssFeeds/rssFeeds.controller.js'
const utility = require('../utility')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const feedparser = require('feedparser-promised')

exports.create = function (req, res) {
  checkValidations(req.body, req.user.companyId)
    .then(result => {
      saveRSSFeed(req.body, req.user._id, req.user.companyId, res)
    })
    .catch((err) => {
      console.log('error got', err)
      sendErrorResponse(res, 500, err.toString())
    })
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

function checkValidations (body, companyId) {
  return new Promise(function (resolve, reject) {
    DataLayer.countDocuments({companyId: companyId, title: {$regex: '.*' + body.title + '.*', $options: 'i'}})
      .then(rssFeeds => {
        if (rssFeeds.length > 0) {
          reject(Error(`Can not create more RSS Feeds with the same Title`))
        } else {
          feedparser.parse(body.feedUrl)
            .then(feed => {
              if (feed) {
                if (body.isActive) {
                  DataLayer.countDocuments({companyId: companyId, isActive: true})
                    .then(rssFeeds => {
                      if (rssFeeds.length > 0 && rssFeeds[0].count >= 13) {
                        reject(Error(`Can not create more than 13 active Feeds at a time!`))
                      } else {
                        resolve()
                      }
                    })
                    .catch(error => {
                      reject(Error(`Failed to fetch RSS Feeds ${error}`))
                    })
                } else {
                  resolve()
                }
              } else {
                reject(Error(`Invalid Feed URL provided`))
              }
            })
            .catch((err) => {
              logger.serverLog(TAG, `Invalid Feed URL provided ${err}`)
              reject(Error(`Invalid Feed URL provided`))
            })
        }
      })
      .catch(error => {
        reject(Error(`Failed to fetch RSS Feeds ${error}`))
      })
  })
}
