const { callApi } = require('../server/api/v1.1/utility')
const logger = require('../server/components/logger')
const TAG = 'scripts/rssScript.js'
const og = require('open-graph')
const feedparser = require('feedparser-promised')
const async = require('async')
const { getScheduledTime } = require('../server/api/global/utility')
const RSSFeedsDataLayer = require('../server/api/v1.1/rssFeeds/rssFeeds.datalayer')
const RssFeedPostsDataLayer = require('../server/api/v1.1/rssFeeds/rssFeedPosts.datalayer')
const RssSubscriptionsDataLayer = require('../server/api/v1.1/rssFeeds/rssSubscriptions.datalayer')
const request = require('request')

exports.runRSSScript = () => {
  RSSFeedsDataLayer.genericFindForRssFeeds({isActive: true})
    .then(rssFeeds => {
      async.eachOf(rssFeeds, function (rssFeed) {
      // rssFeeds.forEach(rssFeed => {
        if (new Date(rssFeed.scheduledTime).getTime() <=
          new Date().getTime()) {
          let pageQuery = {connected: true, companyId: rssFeed.companyId, gotPageSubscriptionPermission: true}
          if (rssFeed.pageIds.length > 0) {
            pageQuery['_id'] = {$in: rssFeed.pageIds}
          }
          callApi(`pages/query`, 'post', pageQuery)
            .then(pages => {
              async.eachOf(pages, function (page) {
                let data = {
                  rssFeed: rssFeed,
                  page: page
                }
                async.series([
                  _performAction.bind(null, data),
                  _updateScheduledTime.bind(null, data)
                ], function (err) {
                  if (err) {
                    logger.serverLog(TAG, `Failed to send rss updates. ${JSON.stringify(err)}`)
                  } else {
                    logger.serverLog(TAG, `RSS updates sent Successfullyf for url ${rssFeed.feedUrl}`)
                  }
                })
              })
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`, 'error')
            })
        }
      })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch rss feeds ${err}`, 'error')
    })
}

const _performAction = (data, next) => {
  async.series([
    _getSubscribers.bind(null, data),
    _checkRssSubscriptions.bind(null, data),
    _parseFeed.bind(null, data),
    _prepareMessageData.bind(null, data),
    _prepareBatchData.bind(null, data),
    _callBatchAPI.bind(null, data),
    _saveRssFeedPost.bind(null, data)
  ], function (err) {
    if (err) {
      next(err)
    } else {
      next()
    }
  })
}

const _getSubscribers = (data, next) => {
  let subscribersData = [
    {$match: {pageId: data.page._id, companyId: data.page.companyId, isSubscribed: true, completeInfo: true}}
  ]
  callApi('subscribers/aggregate', 'post', subscribersData)
    .then(subscribers => {
      data.subscribers = subscribers
      next()
    })
    .catch(err => {
      next(err)
    })
}
const _checkRssSubscriptions = (data, next) => {
  let subscriberIds = data.subscribers.map(subscriber => subscriber._id)
  if (data.rssFeed.defaultFeed) {
    RssSubscriptionsDataLayer.genericFindForRssSubscriptions({subscriberId: {$in: subscriberIds}, rssFeedId: data.rssFeed._id, subscription: false})
      .then(rssSubscriptions => {
        let finalSubscribersList = data.subscribers
        if (rssSubscriptions.length > 0) {
          for (let i = 0; i < data.subscribers.length; i++) {
            for (let j = 0; j < rssSubscriptions.length; j++) {
              if (data.subscribers[i]._id === rssSubscriptions[j].subscriberId) {
                finalSubscribersList.splice(i, 1)
              }
            }
          }
          data.subscribers = finalSubscribersList
        }
        next()
      })
      .catch(err => {
        next(err)
      })
  } else {
    RssSubscriptionsDataLayer.genericFindForRssSubscriptions({subscriberId: {$in: subscriberIds}, rssFeedId: data.rssFeed._id, subscription: true})
      .then(rssSubscriptions => {
        let finalSubscribersList = []
        if (rssSubscriptions.length > 0) {
          for (let i = 0; i < data.subscribers.length; i++) {
            for (let j = 0; j < rssSubscriptions.length; j++) {
              if (data.subscribers[i]._id === rssSubscriptions[j].subscriberId) {
                finalSubscribersList.push(data.subscribers[i])
              }
            }
          }
        }
        data.subscribers = finalSubscribersList
        next()
      })
      .catch(err => {
        next(err)
      })
  }
}
const _parseFeed = (data, next) => {
  feedparser.parse(data.rssFeed.feedUrl)
    .then(feed => {
      data.feed = feed
      next()
    })
    .catch(err => {
      next(err)
    })
}
const _prepareMessageData = (data, next) => {
  let quickReplies = [{
    content_type: 'text',
    title: 'Unsubscribe from News Feed',
    payload: JSON.stringify([{action: 'unsubscribe_from_rssFeed', rssFeedId: data.rssFeed._id}])
  },
  {
    content_type: 'text',
    title: 'Show More Topics',
    payload: JSON.stringify([{action: 'show_more_topics', rssFeedId: data.rssFeed._id}])
  }
  ]
  getMetaData(data.feed, data.rssFeed)
    .then(gallery => {
      logger.serverLog(TAG, `gallery.length ${gallery.length}`)
      let messageData = [{
        text: `Here are your daily updates from ${data.rssFeed.title} News:`
      },
      {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: gallery
          }
        },
        quick_replies: quickReplies
      }]
      data.messageData = messageData
      next()
    })
    .catch(err => {
      next(err)
    })
}
function getMetaData (feed, rssFeed) {
  return new Promise((resolve, reject) => {
    logger.serverLog(TAG, `feed.length ${feed.length}`)
    let gallery = []
    let length = rssFeed.storiesCount
    for (let i = 0; i < length; i++) {
      og(feed[i].link, (err, meta) => {
        if (err) {
          logger.serverLog(TAG, 'error in fetching metdata', 'error')
        }
        if (meta && meta.title && meta.image) {
          gallery.push({
            title: meta.title,
            subtitle: meta.description ? meta.description : '',
            image_url: meta.image.url.constructor === Array ? meta.image.url[0] : meta.image.url,
            buttons: [
              {
                type: 'web_url',
                title: 'Read More...',
                url: feed[i].link
              }
            ]
          })
        }
        if (i === length - 1) {
          resolve(gallery)
        }
      })
    }
  })
}
const _updateScheduledTime = (data, next) => {
  RSSFeedsDataLayer.genericUpdateRssFeed(
    {_id: data.rssFeed._id},
    {scheduledTime: getScheduledTime(data.rssFeed.timeInterval)},
    {}
  )
    .then(updated => {
      next()
    })
    .catch(err => {
      next(err)
    })
}
const _prepareBatchData = (data, next) => {
  let batch = []
  for (let i = 0; i <= data.subscribers.length; i++) {
    if (i === data.subscribers.length) {
      data.batch = JSON.stringify(batch)
      next()
    } else {
      let recipient = 'recipient=' + encodeURIComponent(JSON.stringify({'id': data.subscribers[i].senderId}))
      let tag = 'tag=' + encodeURIComponent('NON_PROMOTIONAL_SUBSCRIPTION')
      let messagingType = 'messaging_type=' + encodeURIComponent('MESSAGE_TAG')
      data.messageData.forEach((item, index) => {
        let message = 'message=' + encodeURIComponent(JSON.stringify(item))
        if (index === 0) {
          batch.push({ 'method': 'POST', 'name': `${data.subscribers[i].senderId}${index + 1}`, 'relative_url': 'v4.0/me/messages', 'body': recipient + '&' + message + '&' + messagingType + '&' + tag })
        } else {
          batch.push({ 'method': 'POST', 'name': `${data.subscribers[i].senderId}${index + 1}`, 'depends_on': `${data.subscribers[i].senderId}${index}`, 'relative_url': 'v4.0/me/messages', 'body': recipient + '&' + message + '&' + messagingType + '&' + tag })
        }
      })
    }
  }
}
const _callBatchAPI = (data, next) => {
  const r = request.post('https://graph.facebook.com', (err, httpResponse, body) => {
    if (err) {
      next(err)
    } else {
      body = JSON.parse(body)
      next()
    }
  })
  const form = r.form()
  form.append('access_token', data.page.accessToken)
  form.append('batch', data.batch)
}
const _saveRssFeedPost = (data, next) => {
  let dataToSave = {
    rssFeedId: data.rssFeed._id,
    pageId: data.page._id,
    companyId: data.rssFeed.companyId,
    sent: data.subscribers.length

  }
  RssFeedPostsDataLayer.createForRssFeedPosts(dataToSave)
    .then(saved => {
      next()
    })
    .catch(err => {
      next(err)
    })
}
exports._parseFeed = _parseFeed
exports.getMetaData = getMetaData
