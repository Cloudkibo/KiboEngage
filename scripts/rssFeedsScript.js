const { callApi } = require('../server/api/v1.1/utility')
const logger = require('../server/components/logger')
const TAG = 'scripts/rssScript.js'
const og = require('open-graph')
const url = require('url')
const feedparser = require('feedparser-promised')
const async = require('async')
const { getScheduledTime } = require('../server/api/global/utility')
const RSSFeedsDataLayer = require('../server/api/v1.1/rssFeeds/rssFeeds.datalayer')
const RssFeedPostsDataLayer = require('../server/api/v1.1/rssFeeds/rssFeedPosts.datalayer')
const RssFeedPostSubscribers = require('../server/api/v1.1/rssFeeds/rssFeedPostSubscribers.datalayer')
const RssSubscriptionsDataLayer = require('../server/api/v1.1/rssFeeds/rssSubscriptions.datalayer')
const request = require('request')
const config = require('../server/config/environment/index')

exports.runRSSScript = () => {
  RSSFeedsDataLayer.genericFindForRssFeeds({isActive: true})
    .then(rssFeeds => {
      let defaultFeeds = rssFeeds.filter(feed => feed.defaultFeed === true)
      let nonDefaultFeeds = rssFeeds.filter(feed => feed.defaultFeed === false)
      let nonDefaultFeedIds = nonDefaultFeeds.map(feed => feed._id)
      RssSubscriptionsDataLayer.genericFindForRssSubscriptions({rssFeedId: {$in: nonDefaultFeedIds}, subscription: true})
        .then(rssSubscriptions => {
          let rssSubscriptionIds = rssSubscriptions.map(rssSubscription => rssSubscription.rssFeedId)
          nonDefaultFeeds = nonDefaultFeeds.filter(feed => rssSubscriptionIds.includes(feed._id))
          rssFeeds = defaultFeeds.concat(nonDefaultFeeds)
          async.eachSeries(rssFeeds, _handleRSSFeed, function (err) {
            if (err) {
              logger.serverLog(TAG, err, 'error')
            }
          })
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch rss subscription ${err}`, 'error')
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch rss feeds ${err}`, 'error')
    })
}

const _handleRSSFeed = (rssFeed, next) => {
  let x = true
  if (x || new Date(rssFeed.scheduledTime).getTime() <= new Date().getTime()) {
    let data = {
      rssFeed: rssFeed
    }
    async.series([
      _parseFeed.bind(null, data),
      _fetchPage.bind(null, data),
      _saveRssFeedPost.bind(null, data),
      _prepareMessageData.bind(null, data),
      _handleFeed.bind(null, data),
      _updateScheduledTime.bind(null, data)
    ], function (err) {
      if (err) {
        next(err)
      } else {
        next()
      }
    })
  } else {
    next()
  }
}

const _fetchPage = (data, next) => {
  callApi(`pages/query`, 'post', {_id: data.rssFeed.pageIds[0]})
    .then(pages => {
      data.page = pages[0]
      next()
    })
    .catch((err) => {
      next(err)
    })
}

// route = https://kiboengage.com/clicked?r=originalUrl&m=rss&id=post_id

const _handleFeed = (data, next) => {
  if (data.rssFeed.defaultFeed) {
    const criteria = [
      {$match: {pageId: {$in: data.rssFeed.pageIds}, companyId: data.rssFeed.companyId, isSubscribed: true, completeInfo: true}},
      {$limit: 50}
    ]
    sendFeed('default', criteria, data.messageData, data.page, data.rssFeed, data.rssFeedPost)
    next()
  } else {
    const criteria = {
      purpose: 'aggregate',
      match: {subscription: true, rssFeedId: data.rssFeed._id},
      limit: 50
    }
    sendFeed('nonDefault', criteria, data.messageData, data.page, data.rssFeed, data.rssFeedPost)
    next()
  }
}

const sendFeed = (type, criteria, payload, page, feed, rssFeedPost) => {
  let subscribersPromise = new Promise((resolve, reject) => {
    if (type === 'default') {
      callApi('subscribers/aggregate', 'post', criteria)
        .then(subscribers => {
          if (subscribers.length > 0) {
            callApi('rssSubscriptions/query', 'post', {purpose: 'findAll', match: {rssFeedId: feed._id, subscription: false}}, 'kiboengage')
              .then(result => {
                if (result && result.length > 0) {
                  let subIds = result.map(r => r.subscriberId._id)
                  subscribers = subscribers.filter(s => !subIds.includes(s._id))
                  if (subscribers.length > 0) resolve(subscribers, subscribers[subscribers.length - 1]._id)
                  else resolve(subscribers)
                } else {
                  resolve(subscribers)
                }
              })
          } else {
            resolve(subscribers)
          }
        })
        .catch((err) => {
          reject(err)
        })
    } else {
      callApi('rssSubscriptions/query', 'post', criteria, 'kiboengage')
        .then(subscriptions => {
          if (subscriptions.length > 0) {
            let subscribers = subscriptions.map(s => s.subscriberId)
            resolve(subscribers, subscriptions[subscriptions.length - 1]._id)
          } else {
            resolve(subscriptions)
          }
        })
        .catch((err) => {
          reject(err)
        })
    }
  })

  subscribersPromise
    .then((subscribers, lastId) => {
      if (subscribers.length > 0) {
        prepareBatchData(subscribers, payload, page, rssFeedPost)
          .then(batch => {
            return callBatchAPI(page, batch)
          })
          .then(response => {
            if (criteria.match) criteria.match._id = {$gt: lastId}
            else if (criteria[0].$match) criteria[0].$match._id = {$gt: lastId}
            sendFeed(type, criteria, payload, page, feed, rssFeedPost)
          })
          .catch(err => {
            logger.serverLog(TAG, err, 'error')
          })
      } else {
        logger.serverLog(TAG, 'Feed sent successfully!')
      }
      // return prepareBatchData(subscribers, payload, page, rssFeedPost)
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
    })
}

const prepareBatchData = (subscribers, messageData, page, rssFeedPost) => {
  return new Promise((resolve, reject) => {
    let batch = []
    for (let i = 0; i <= subscribers.length; i++) {
      if (i === subscribers.length) {
        resolve(JSON.stringify(batch))
      } else {
        let recipient = 'recipient=' + encodeURIComponent(JSON.stringify({'id': subscribers[i].senderId}))
        let tag = 'tag=' + encodeURIComponent('NON_PROMOTIONAL_SUBSCRIPTION')
        let messagingType = 'messaging_type=' + encodeURIComponent('MESSAGE_TAG')
        messageData.forEach((item, index) => {
          let message = 'message=' + encodeURIComponent(JSON.stringify(changeUrlForClicked(item, rssFeedPost, subscribers[i])))
          if (index === 0) {
            batch.push({ 'method': 'POST', 'name': `${subscribers[i].senderId}${index + 1}`, 'relative_url': 'v4.0/me/messages', 'body': recipient + '&' + message + '&' + messagingType + '&' + tag })
          } else {
            batch.push({ 'method': 'POST', 'name': `${subscribers[i].senderId}${index + 1}`, 'depends_on': `${subscribers[i].senderId}${index}`, 'relative_url': 'v4.0/me/messages', 'body': recipient + '&' + message + '&' + messagingType + '&' + tag })
          }
        })
        saveRssFeedPostSubscriber(subscribers[i]._id, page, rssFeedPost)
      }
    }
  })
}

const changeUrlForClicked = (item, rssFeedPost, subscriber) => {
  if (item.attachment) {
    let elements = item.attachment.payload.elements
    for (let i = 0; i < elements.length; i++) {
      let button = JSON.parse(JSON.stringify(elements[i].buttons[0]))
      let redirectUrl = button.url
      let query = url.parse(redirectUrl, true).query
      if (query && query.sId) {
        elements[i].buttons[0].url = new url.URL(`/clicked?r=${query.r}&m=rss&id=${rssFeedPost._id}&sId=${subscriber._id}`, config.domain).href
      } else {
        elements[i].buttons[0].url = config.domain + `/clicked?r=${redirectUrl}&m=rss&id=${rssFeedPost._id}&sId=${subscriber._id}`
      }
    }
  }
  return item
}

const callBatchAPI = (page, batch) => {
  return new Promise((resolve, reject) => {
    const r = request.post('https://graph.facebook.com', (err, httpResponse, body) => {
      if (err) {
        reject(err)
      } else {
        body = JSON.parse(body)
        resolve('success')
      }
    })
    const form = r.form()
    form.append('access_token', page.accessToken)
    form.append('batch', batch)
  })
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
  RSSFeedsDataLayer.genericFindForRssFeeds({
    companyId: data.rssFeed.companyId,
    _id: {$ne: data.rssFeed._id},
    isActive: true,
    pageIds: data.page._id
  })
    .then(rssFeeds => {
      let quickReplies = [{
        content_type: 'text',
        title: 'Unsubscribe from News Feed',
        payload: JSON.stringify([{action: 'unsubscribe_from_rssFeed', rssFeedId: data.rssFeed._id}])
      }
      ]
      if (rssFeeds.length > 0) {
        quickReplies.push({
          content_type: 'text',
          title: 'Show More Topics',
          payload: JSON.stringify([{action: 'show_more_topics', rssFeedId: data.rssFeed._id}])
        })
      }
      getMetaData(data.feed, data.rssFeed, data.rssFeedPost)
        .then(gallery => {
          logger.serverLog(TAG, `gallery.length ${gallery.length}`)
          let messageData = [{
            text: `Here are your daily updates from ${data.rssFeed.title} News:`
          }, {
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
    })
    .catch(err => {
      next(err)
    })
}
function getMetaData (feed, rssFeed, rssFeedPost) {
  return new Promise((resolve, reject) => {
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
          if (i === length - 1) {
            resolve(gallery)
          }
        } else if (i === length - 1) {
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

const _saveRssFeedPost = (data, next) => {
  let dataToSave = {
    rssFeedId: data.rssFeed._id,
    pageId: data.page._id,
    companyId: data.rssFeed.companyId

  }
  RssFeedPostsDataLayer.createForRssFeedPosts(dataToSave)
    .then(saved => {
      data.rssFeedPost = saved
      next()
    })
    .catch(err => {
      next(err)
    })
}
const saveRssFeedPostSubscriber = (subscriberId, page, rssFeedPost) => {
  let dataToSave = {
    rssFeedId: rssFeedPost.rssFeedId,
    rssFeedPostId: rssFeedPost._id,
    companyId: page.companyId,
    pageId: page._id,
    subscriberId: subscriberId,
    sent: 0,
    seen: 0,
    clicked: 0
  }
  RssFeedPostSubscribers.create(dataToSave)
    .then(saved => {
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to save RssFeedPostSubscriber ${err}`, 'error')
    })
}
exports._parseFeed = _parseFeed
exports.getMetaData = getMetaData
