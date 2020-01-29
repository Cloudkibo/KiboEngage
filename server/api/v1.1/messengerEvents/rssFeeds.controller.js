const logger = require('../../../components/logger')
const TAG = 'api/messengerEvents/rssFeeds.controller.js'
const {callApi} = require('../utility')
const RssSubscriptionsDataLayer = require('../newsSections/newsSubscriptions.datalayer')
const RssFeedsDataLayer = require('../newsSections/newsSections.datalayer')
const { facebookApiCaller } = require('../../global/facebookApiCaller')
const async = require('async')
const rssScriptFunctions = require('../../../../scripts/rssFeedsScript')
const og = require('open-graph')
const {domainName} = require('../../global/utility')

exports.changeSubscription = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let resp
  if (req.body.entry[0].messaging[0].message && req.body.entry[0].messaging[0].message.quick_reply) {
    resp = JSON.parse(req.body.entry[0].messaging[0].message.quick_reply.payload)
  } else {
    resp = JSON.parse(req.body.entry[0].messaging[0].postback.payload)
  }
  const sender = req.body.entry[0].messaging[0].sender.id
  const pageId = req.body.entry[0].messaging[0].recipient.id
  RssFeedsDataLayer.genericFindForRssFeeds({_id: resp.rssFeedId})
    .then(rssFeeds => {
      if (rssFeeds.length > 0) {
        let data = {
          sender: sender,
          pageId: pageId,
          resp: resp,
          rssFeed: rssFeeds[0]
        }
        async.series([
          _fetchPage.bind(null, data),
          _fetchSubscriber.bind(null, data),
          _updateSubscriptionCount.bind(null, data),
          _updateSubscription.bind(null, data),
          _fetchFeeds.bind(null, data),
          _sendSubscriptionMessage.bind(null, data)
        ], function (err) {
          if (err) {
            logger.serverLog(TAG, `Failed to subscribe or unsubscribe ${err}`, 'error')
          } else {
            logger.serverLog(TAG, 'Subscrption successfully')
          }
        })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch feed ${err}`, 'error')
    })
}
exports.showMoreTopics = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let resp
  if (req.body.entry[0].messaging[0].message && req.body.entry[0].messaging[0].message.quick_reply) {
    resp = JSON.parse(req.body.entry[0].messaging[0].message.quick_reply.payload)
  } else {
    resp = JSON.parse(req.body.entry[0].messaging[0].postback.payload)
  }
  const sender = req.body.entry[0].messaging[0].sender.id
  const pageId = req.body.entry[0].messaging[0].recipient.id
  let data = {
    sender: sender,
    pageId: pageId,
    resp: resp
  }
  async.series([
    _fetchPage.bind(null, data),
    _fetchFeeds.bind(null, data),
    _prepareMoreTopics.bind(null, data),
    _sendMessage.bind(null, data)
  ], function (err) {
    if (err) {
      logger.serverLog(TAG, `Failed to subscribe or unsubscribe ${err}`, 'error')
    } else {
      logger.serverLog(TAG, 'Subscrption successfully')
    }
  })
}
const _fetchPage = (data, next) => {
  let aggregateData = [
    {$match: { pageId: data.pageId, connected: true }}
  ]
  callApi(`pages/aggregate`, 'post', aggregateData)
    .then(page => {
      data.page = page[0]
      next()
    })
    .catch(err => {
      next(err)
    })
}
const _fetchSubscriber = (data, next) => {
  callApi(`subscribers/query`, 'post', { pageId: data.page._id, senderId: data.sender, companyId: data.page.companyId, completeInfo: true })
    .then(subscriber => {
      data.subscriber = subscriber[0]
      next()
    })
    .catch((err) => {
      next(err)
    })
}
const _updateSubscription = (data, next) => {
  let updateData = {
    subscriberId: {
      _id: data.subscriber._id,
      firstName: data.subscriber.firstName,
      lastName: data.subscriber.lastName,
      gender: data.subscriber.gender,
      locale: data.subscriber.locale,
      senderId: data.subscriber.senderId
    },
    newsSectionId: data.resp.rssFeedId,
    subscription: data.resp.action === 'subscribe_to_rssFeed' ? true : false
  }
  RssSubscriptionsDataLayer.genericUpdateRssSubscriptions({'subscriberId._id': data.subscriber._id, newsSectionId: data.resp.rssFeedId}, updateData, {upsert: true})
    .then(rssSubscription => {
      next()
    })
    .catch(err => {
      next(err)
    })
}
const _updateSubscriptionCount = (data, next) => {
  if (data.resp.action === 'subscribe_to_rssFeed') {
    RssSubscriptionsDataLayer.genericFindForRssSubscriptions({'subscriberId._id': data.subscriber._id, newsSectionId: data.resp.rssFeedId, subscription: true})
      .then(rssSubscriptions => {
        if (rssSubscriptions.length === 0) {
          RssFeedsDataLayer.genericUpdateRssFeed({_id: data.resp.rssFeedId}, { $inc: { subscriptions: 1 } }, {})
            .then(updated => {
              next()
            })
            .catch(err => {
              next(err)
            })
        } else next()
      })
      .catch(err => {
        next(err)
      })
  } else {
    RssSubscriptionsDataLayer.genericFindForRssSubscriptions({'subscriberId._id': data.subscriber._id, newsSectionId: data.resp.rssFeedId, subscription: false})
      .then(rssSubscriptions => {
        if (rssSubscriptions.length === 0) {
          RssFeedsDataLayer.genericUpdateRssFeed({_id: data.resp.rssFeedId}, { $inc: { subscriptions: -1 } }, {})
            .then(updated => {
              next()
            })
            .catch(err => {
              next(err)
            })
        } else next()
      })
      .catch(err => {
        next(err)
      })
  }
}
const _fetchFeeds = (data, next) => {
  var query = {
    companyId: data.page.companyId,
    isActive: true,
    pageIds: {$in: [data.page._id]}
  }
  if (data.resp.rssFeedId && data.resp.rssFeedId !== '') {
    query['_id'] ={$ne: data.resp.rssFeedId}
  }
  RssFeedsDataLayer.genericFindForRssFeeds(query)
    .then(rssFeeds => {
      data.rssFeeds = rssFeeds
      next()
    })
    .catch(err => {
      next(err)
    })
}
const _prepareMoreTopics = (data, next) => {
  let quickReplies = []
  for (let i = 0; i < data.rssFeeds.length; i++) {
    quickReplies.push({
      content_type: 'text',
      title: data.rssFeeds[i].title,
      payload: JSON.stringify([{action: 'send_topic_feed', rssFeedId: data.rssFeeds[i]._id}])
    })
  }
  let messageData = {
    'recipient': {'id': data.sender},
    'message': JSON.stringify({
      'text': 'Tap to get news from these topics:',
      'quick_replies': quickReplies
    })
  }
  data.messageData = messageData
  next()
}
const _sendMessage = (data, next) => {
  facebookApiCaller('v3.3', `me/messages?access_token=${data.page.accessToken}`, 'post', data.messageData)
    .then(response => {
      if (response.body.error) {
        logger.serverLog(TAG, `Failed to send more topics ${JSON.stringify(response.body.error)}`, 'error')
        next(response.body.error)
      } else {
        logger.serverLog(TAG, `More Topics Sent successfully!`)
        next()
      }
    })
    .catch(err => {
      next(err)
    })
}
const _sendSubscriptionMessage = (data, next) => {
  let buttons = []
  if (data.resp.rssFeedId && data.resp.rssFeedId !== '') {
    buttons.push({title: (data.resp.action === 'subscribe_to_rssFeed' ? 'Unsubscribe from ' : 'Subscribe to ') + data.rssFeed.title,
      type: 'postback',
      payload: JSON.stringify({action: data.resp.action === 'subscribe_to_rssFeed' ? 'unsubscribe_from_rssFeed' : 'subscribe_to_rssFeed', rssFeedId: data.resp.rssFeedId})
    })
  }
  if (data.rssFeeds.length > 0) {
    buttons.push(
      {title: 'Show More Topics',
        type: 'postback',
        payload: JSON.stringify({action: 'show_more_topics', rssFeedId: data.resp.rssFeedId})
      }
    )
  }
  let messageData = {
    'recipient': {'id': data.sender},
    'message': JSON.stringify({
      'attachment': {
        'type': 'template',
        'payload': {
          'template_type': 'button',
          'text': data.resp.action === 'subscribe_to_rssFeed' ? 'Subscribed Successfully' : 'Unsubscribed Successfully',
          'buttons': buttons
        }
      }
    })
  }
  facebookApiCaller('v3.3', `me/messages?access_token=${data.page.accessToken}`, 'post', messageData)
    .then(response => {
      if (response.body.error) {
        logger.serverLog(TAG, `Failed to send subcription message ${JSON.stringify(response.body.error)}`, 'error')
        next(response.body.error)
      } else {
        logger.serverLog(TAG, `Subscription Message Sent successfully!`)
        next()
      }
    })
    .catch(err => {
      next(err)
    })
}
exports.sendTopicFeed = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })

  let resp = JSON.parse(req.body.entry[0].messaging[0].message.quick_reply.payload)
  const sender = req.body.entry[0].messaging[0].sender.id
  const pageId = req.body.entry[0].messaging[0].recipient.id
  let data = {
    sender: sender,
    pageId: pageId,
    resp: resp
  }
  async.series([
    _fetchPage.bind(null, data),
    _fetchSubscriber.bind(null, data),
    _fetchFeed.bind(null, data),
    rssScriptFunctions._parseFeed.bind(null, data),
    _fetchFeeds.bind(null, data),
    _prepareQuickReplies.bind(null, data),
    _prepareMessageData.bind(null, data),
    _sendMessage.bind(null, data)
  ], function (err) {
    if (err) {
      logger.serverLog(TAG, `Failed to subscribe or unsubscribe ${err}`, 'error')
    } else {
      logger.serverLog(TAG, 'Subscrption successfully')
    }
  })
}
const _fetchFeed = (data, next) => {
  RssFeedsDataLayer.genericFindForRssFeeds({
    _id: data.resp.rssFeedId
  })
    .then(rssFeeds => {
      data.rssFeed = rssFeeds[0]
      next()
    })
    .catch(err => {
      next(err)
    })
}
const _prepareQuickReplies = (data, next) => {
  let quickReplies = []
  if (data.rssFeeds.length > 0) {
    quickReplies.push({
      content_type: 'text',
      title: 'Show More Topics',
      payload: JSON.stringify([{action: 'show_more_topics', rssFeedId: data.rssFeed._id}])
    })
  }
  if (data.subscriber) {
    if (data.rssFeed.defaultFeed) {
      RssSubscriptionsDataLayer.genericFindForRssSubscriptions({'subscriberId._id': data.subscriber._id, newsSectionId: data.rssFeed._id, subscription: false})
        .then(rssSubscription => {
          if (rssSubscription.length > 0) {
            quickReplies.push({
              content_type: 'text',
              title: `Subscribe to ${data.rssFeed.title}`,
              payload: JSON.stringify([{action: `subscribe_to_rssFeed`, rssFeedId: data.rssFeed._id}])
            })
          } else {
            quickReplies.push({
              content_type: 'text',
              title: `UnSubscribe from ${data.rssFeed.title}`,
              payload: JSON.stringify([{action: `unsubscribe_from_rssFeed`, rssFeedId: data.rssFeed._id}])
            })
          }
          data.quickReplies = quickReplies
          next()
        })
        .catch(err => {
          next(err)
        })
    } else {
      RssSubscriptionsDataLayer.genericFindForRssSubscriptions({'subscriberId._id': data.subscriber._id, newsSectionId: data.rssFeed._id})
        .then(rssSubscription => {
          if (rssSubscription.length > 0 && rssSubscription[0].subscription) {
            quickReplies.push({
              content_type: 'text',
              title: `Unsubscribe from ${data.rssFeed.title}`,
              payload: JSON.stringify([{action: `unsubscribe_from_rssFeed`, rssFeedId: data.rssFeed._id}])
            })
          } else {
            quickReplies.push({
              content_type: 'text',
              title: `Subscribe to ${data.rssFeed.title}`,
              payload: JSON.stringify([{action: `subscribe_to_rssFeed`, rssFeedId: data.rssFeed._id}])
            })
          }
          data.quickReplies = quickReplies
          next()
        })
        .catch(err => {
          next(err)
        })
    }
  } else {
    data.quickReplies = quickReplies
    next()
  }
}
const _prepareMessageData = (data, next) => {
  getMetaData(data.feed, data.rssFeed, data.page)
    .then(gallery => {
      logger.serverLog(TAG, `gallery.length ${gallery.length}`)
      let messageData = {
        'recipient': {'id': data.sender},
        'message': JSON.stringify({
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: gallery
            }
          },
          quick_replies: data.quickReplies
        })
      }
      data.messageData = messageData
      next()
    })
    .catch(err => {
      next(err)
    })
}
function getMetaData (feed, rssFeed, page) {
  return new Promise((resolve, reject) => {
    let gallery = []
    let length = rssFeed.storiesCount
    async.eachOfSeries(feed, function (value, key, callback) {
      if (key < length) {
        og(value.link, (err, meta) => {
          if (err) {
            logger.serverLog(TAG, 'error in fetching metdata', 'error')
          }
          if (meta && meta.title && meta.image) {
            gallery.push({
              title: meta.title,
              subtitle: meta.description ? meta.description : domainName(value.link),
              image_url: meta.image && meta.image.url ? meta.image.url : page.pagePic,
              buttons: [
                {
                  type: 'web_url',
                  title: 'Read More...',
                  url: value.link
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
