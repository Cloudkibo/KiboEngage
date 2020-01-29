const { callApi } = require('../server/api/v1.1/utility')
const logger = require('../server/components/logger')
const TAG = 'scripts/rssScript.js'
const og = require('open-graph')
const feedparser = require('feedparser-promised')
const async = require('async')
const { getScheduledTime, domainName } = require('../server/api/global/utility')
const RSSFeedsDataLayer = require('../server/api/v1.1/newsSections/newsSections.datalayer')
const RssFeedPostsDataLayer = require('../server/api/v1.1/newsSections/newsPosts.datalayer')
const RssFeedPostSubscribers = require('../server/api/v1.1/newsSections/newsPostSubscribers.datalayer')
const RssSubscriptionsDataLayer = require('../server/api/v1.1/newsSections/newsSubscriptions.datalayer')
const request = require('request')
const config = require('../server/config/environment/index')
const url = require('url')

exports.runRSSScript = () => {
  RSSFeedsDataLayer.genericFindForRssFeeds({isActive: true, defaultFeed: true, integrationType: 'rss'})
    .then(rssFeeds => {
      async.eachSeries(rssFeeds, _handleRSSFeed, function (err) {
        if (err) {
          logger.serverLog(TAG, err, 'error')
        }
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
      _fetchPage.bind(null, data),
      _shouldShowMoreTopics.bind(null, data),
      _fetchNonDefaultFeeds.bind(null, data),
      _saveRssFeedPost.bind(null, data),
      _prepareFeeds.bind(null, data),
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

const _prepareFeeds = (data, next) => {
  data.parsedFeeds = {}
  async.each(data.feeds, function (feed, callback) {
    parseFeed(feed)
      .then(parsedFeed => {
        prepareMessageData(parsedFeed, feed, data.showMoreTopics, data.rssFeedPosts, data.page)
          .then(preparedData => {
            data.parsedFeeds[feed._id] = {
              data: preparedData,
              postSubscriber: {
                rssFeedId: feed._id,
                rssFeedPostId: data.rssFeedPosts.filter((item) => item.rssFeedId === feed._id)[0].rssFeedPostId
              }
            }
            callback()
          })
          .catch((err) => {
            logger.serverLog(TAG, err, `In Prepare Message Data Rss Integration ${err}`)
            callback(err)
          })
      })
      .catch((err) => {
        logger.serverLog(TAG, err, `In Parse Feed Rss Integration ${err}`)
        callback(err)
      })
  }, function (err) {
    if (err) {
      next(err)
    } else {
      next()
    }
  })
}

const _fetchNonDefaultFeeds = (data, next) => {
  RSSFeedsDataLayer.genericFindForRssFeeds({isActive: true, defaultFeed: false, pageIds: data.page._id, subscriptions: {$gt: 0}, integrationType: 'rss'})
    .then(rssFeeds => {
      data.feeds = rssFeeds
      data.feeds.unshift(data.rssFeed)
      next()
    })
    .catch((err) => {
      logger.serverLog(TAG, err, `In Fetch Non Default Feeds Rss Integration ${err}`)
      next(err)
    })
}
const _shouldShowMoreTopics = (data, next) => {
  RSSFeedsDataLayer.aggregateForRssFeeds({isActive: true, defaultFeed: false, pageIds: data.page._id, integrationType: 'rss'}, { _id: null, count: { $sum: 1 } })
    .then(rssFeeds => {
      if (rssFeeds.length > 0) {
        data.showMoreTopics = true
      } else {
        data.showMoreTopics = false
      }
      next()
    })
    .catch((err) => {
      logger.serverLog(TAG, err, 'In Prepare Message Data Rss Integration')
      next(err)
    })
}
const _fetchPage = (data, next) => {
  callApi(`pages/query`, 'post', {_id: data.rssFeed.pageIds[0]})
    .then(pages => {
      data.page = pages[0]
      next()
    })
    .catch((err) => {
      logger.serverLog(TAG, err, `In fetch page Rss Integration ${err}`)
      next(err)
    })
}

const _handleFeed = (data, next) => {
  const criteria = [
    {$match: {pageId: data.page._id, companyId: data.page.companyId, isSubscribed: true, completeInfo: true}},
    {$limit: Math.floor(50 / Object.keys(data.parsedFeeds).length)}
  ]
  const rssFeedIds = data.feeds.map((f) => f._id)
  sendFeed(criteria, data.page, data.rssFeed, data.rssFeedPost, data.parsedFeeds, rssFeedIds)
  next()
}

const sendFeed = (criteria, page, feed, rssFeedPost, parsedFeeds, rssFeedIds) => {
  let subscribersPromise = new Promise((resolve, reject) => {
    callApi('subscribers/aggregate', 'post', criteria)
      .then(subscribers => {
        if (subscribers.length > 0) resolve(subscribers, subscribers[subscribers.length - 1]._id)
        else resolve(subscribers)
      })
      .catch((err) => {
        logger.serverLog(TAG, err, `In Send Feed Rss Integration ${err}`)
        reject(err)
      })
  })

  subscribersPromise
    .then((subscribers, lastId) => {
      if (subscribers.length > 0) {
        prepareBatchData(subscribers, page, rssFeedPost, feed, parsedFeeds, rssFeedIds)
          .then(batch => {
            return callBatchAPI(page, batch)
          })
          .then(response => {
            criteria[0].$match._id = {$gt: lastId}
            sendFeed(criteria, page, feed, rssFeedPost, parsedFeeds, rssFeedIds)
          })
          .catch(err => {
            logger.serverLog(TAG, err, `In Prepare Batch Data ${err}`)
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

const prepareMessage = (subscriber, parsedFeeds, feed, rssFeedIds, rssFeedPosts) => {
  return new Promise((resolve, reject) => {
    let messageData = []
    let postSubscribers = []
    let payload = {}
    let postSubscriberData = {
      companyId: subscriber.companyId,
      pageId: subscriber.pageId,
      subscriberId: subscriber._id,
      sent: 0,
      seen: 0,
      clicked: 0
    }
    RssSubscriptionsDataLayer.genericFindForRssSubscriptions({'subscriberId._id': subscriber._id, newsSectionId: {$in: rssFeedIds}})
      .then(rssSubscriptions => {
        if (rssSubscriptions.length > 0) {
          let isDefaultUnsubscribed = rssSubscriptions.findIndex((s) => (s.newsSectionId === feed._id && !s.subscription))
          if (isDefaultUnsubscribed === -1) {
            messageData = messageData.concat(parsedFeeds[feed._id].data)
            postSubscriberData.newsSectionId = parsedFeeds[feed._id].postSubscriber.rssFeedId
            postSubscriberData.newsPostId = parsedFeeds[feed._id].postSubscriber.rssFeedPostId
            postSubscribers.push(JSON.parse(JSON.stringify(postSubscriberData)))
          }
          const subscribedFeeds = rssSubscriptions.filter((s) => (s.subscription && s.newsSectionId !== feed._id))
          if (subscribedFeeds.length > 0) {
            const feedIds = subscribedFeeds.map((f) => f.newsSectionId)
            for (let [key, value] of Object.entries(parsedFeeds)) {
              if (feedIds.includes(key)) {
                messageData = messageData.concat(value.data)
                postSubscriberData.newsSectionId = value.postSubscriber.rssFeedId
                postSubscriberData.newsPostId = value.postSubscriber.rssFeedPostId
                postSubscribers.push(postSubscriberData)
              }
            }
            payload = {
              data: messageData,
              postSubscribers
            }
            resolve(payload)
          } else {
            payload = {
              data: messageData,
              postSubscribers
            }
            resolve(payload)
          }
        } else {
          postSubscriberData.newsSectionId = parsedFeeds[feed._id].postSubscriber.rssFeedId
          postSubscriberData.newsPostId = parsedFeeds[feed._id].postSubscriber.rssFeedPostId
          payload = {
            data: parsedFeeds[feed._id].data,
            postSubscribers: [postSubscriberData]
          }
          resolve(payload)
        }
      })
      .catch((err) => {
        logger.serverLog(TAG, err, `In Prepare Message ${err}`)
        reject(err)
      })
  })
}

const prepareBatchData = (subscribers, page, rssFeedPost, feed, parsedFeeds, rssFeedIds) => {
  return new Promise((resolve, reject) => {
    let batch = []
    let waitingForUserInput = {
      componentIndex: -1
    }
    _removeSubsWaitingForUserInput(subscribers, waitingForUserInput)
    async.each(subscribers, function (subscriber, callback) {
      let recipient = 'recipient=' + encodeURIComponent(JSON.stringify({'id': subscriber.senderId}))
      let tag = 'tag=' + encodeURIComponent('NON_PROMOTIONAL_SUBSCRIPTION')
      let messagingType = 'messaging_type=' + encodeURIComponent('MESSAGE_TAG')
      prepareMessage(subscriber, parsedFeeds, feed, rssFeedIds)
        .then(payload => {
          if (payload.data.length > 0) {
            payload.data.forEach((item, index) => {
              let message = 'message=' + encodeURIComponent(JSON.stringify(changeUrlForClicked(item, rssFeedPost, subscriber)))
              if (index === 0) {
                batch.push({ 'method': 'POST', 'name': `${subscriber.senderId}${index + 1}`, 'relative_url': 'v4.0/me/messages', 'body': recipient + '&' + message + '&' + messagingType + '&' + tag })
              } else {
                batch.push({ 'method': 'POST', 'name': `${subscriber.senderId}${index + 1}`, 'depends_on': `${subscriber.senderId}${index}`, 'relative_url': 'v4.0/me/messages', 'body': recipient + '&' + message + '&' + messagingType + '&' + tag })
              }
              if (index === (payload.data.length - 1)) {
                saveRssFeedPostSubscribers(payload.postSubscribers)
                callback()
              }
            })
          } else {
            callback()
          }
        })
        .catch((err) => {
          logger.serverLog(TAG, err, `In Prepare Message ${err}`)
          callback(err)
        })
    }, function (err) {
      if (err) {
        reject(err)
      } else {
        resolve(JSON.stringify(batch))
      }
    })
  })
}

const changeUrlForClicked = (item, rssFeedPost, subscriber) => {
  if (item.attachment) {
    let elements = item.attachment.payload.elements
    for (let i = 0; i < elements.length; i++) {
      // elements[i].buttons[0].url = elements[i].buttons[0].url + `&sId=${subscriber._id}`
      // console.log('button url', elements[i].buttons[0].url)
      let button = JSON.parse(JSON.stringify(elements[i].buttons[0]))
      let redirectUrl = button.url
      let query = url.parse(redirectUrl, true).query
      if (query && query.sId) {
        elements[i].buttons[0].url = new url.URL(`/clicked?r=${query.r}&m=rss&id=${query.id}&sId=${subscriber._id}`, config.domain).href
      } else {
        elements[i].buttons[0].url = elements[i].buttons[0].url + `&sId=${subscriber._id}`
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
      logger.serverLog(TAG, err, `In Parse Feed ${err}`)
      next(err)
    })
}
const prepareMessageData = (parsedFeed, feed, showMoreTopics, rssFeedPosts, page) => {
  return new Promise((resolve, reject) => {
    let quickReplies = [{
      content_type: 'text',
      title: 'Unsubscribe from News Feed',
      payload: JSON.stringify([{action: 'unsubscribe_from_rssFeed', rssFeedId: feed._id}])
    }
    ]
    if (showMoreTopics) {
      quickReplies.push({
        content_type: 'text',
        title: 'Show More Topics',
        payload: JSON.stringify([{action: 'show_more_topics', rssFeedId: feed._id}])
      })
    }
    getMetaData(parsedFeed, feed, rssFeedPosts, page)
      .then(gallery => {
        logger.serverLog(TAG, `gallery.length ${gallery.length} for feed.title`)
        let messageData = [{
          text: `Here are your daily updates from ${feed.title} News:`
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
        resolve(messageData)
      })
      .catch(err => {
        logger.serverLog(TAG, err, `In Prepare Message Data ${err}`)
        reject(err)
      })
  })
}
function getMetaData (feed, rssFeed, rssFeedPosts, page) {
  return new Promise((resolve, reject) => {
    let rssFeedPost = rssFeedPosts.filter(r => r.rssFeedId === rssFeed._id)[0]
    let gallery = []
    let length = rssFeed.storiesCount
    async.eachOfSeries(feed, function (value, key, callback) {
      if (key < length) {
        og(value.link, (err, meta) => {
          if (err) {
            logger.serverLog(TAG, 'error in fetching metdata', 'error')
          }
          if (meta && meta.title) {
            gallery.push({
              title: meta.title,
              subtitle: meta.description ? meta.description : domainName(value.link),
              image_url: meta.image && meta.image.url ? meta.image.url : page.pagePic,
              buttons: [
                {
                  type: 'web_url',
                  title: 'Read More...',
                  url: config.domain + `/clicked?r=${value.link}&m=rss&id=${rssFeedPost.rssFeedPostId}`
                }
              ]
            })
            callback()
          } else {
            callback()
          }
        })
      } else {
        callback()
      }
    }, function (err) {
      if (err) {
        reject(err)
      } else {
        resolve(gallery)
      }
    })
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
  let rssFeedPosts = []
  async.each(data.feeds, function (feed, callback) {
    let dataToSave = {
      newsSectionId: feed._id,
      pageId: data.page._id,
      companyId: feed.companyId
    }
    RssFeedPostsDataLayer.createForRssFeedPosts(dataToSave)
      .then(saved => {
        rssFeedPosts.push({rssFeedId: feed._id, rssFeedPostId: saved._id})
        callback()
      })
      .catch(err => {
        callback(err)
      })
  }, function (err) {
    if (err) {
      next(err)
    } else {
      data.rssFeedPosts = rssFeedPosts
      next()
    }
  })
}
const saveRssFeedPostSubscribers = (postSubscribers) => {
  async.each(postSubscribers, function (postSubscriber, next) {
    RssFeedPostSubscribers.create(postSubscriber)
      .then(saved => {
        next()
      })
      .catch(err => {
        logger.serverLog(TAG, err, 'In save rss eed Rss Integration')
        next(err)
      })
  }, function (err) {
    if (err) {
      logger.serverLog(TAG, `Failed to save RssFeedPostSubscribers ${err}`, 'error')
    }
  })
}
function parseFeed (feed) {
  return new Promise((resolve, reject) => {
    feedparser.parse(feed.feedUrl)
      .then(feed => {
        resolve(feed)
      })
      .catch(err => {
        logger.serverLog(TAG, err, 'In Parse Feed Rss Integration')
        reject(err)
      })
  })
}
const _removeSubsWaitingForUserInput = (subscribers, waitingForUserInput) => {
  let subscriberIds = subscribers.map(subscriber => subscriber._id)
  callApi(`subscribers/update`, 'put', {query: {_id: subscriberIds, waitingForUserInput: { '$ne': null }}, newPayload: {waitingForUserInput: waitingForUserInput}, options: {multi: true}})
    .then(updated => {
      logger.serverLog(TAG, `Succesfully updated subscriber _removeSubsWaitingForUserInput in RSS Feed`)
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to update subscriber in RSS FEED ${JSON.stringify(err)}`)
    })
}
exports._parseFeed = _parseFeed
exports.getMetaData = getMetaData
