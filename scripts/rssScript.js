const { callApi } = require('../server/api/v1.1/utility')
const logger = require('../server/components/logger')
const TAG = 'scripts/rssScript.js'
const og = require('open-graph')
const feedparser = require('feedparser-promised')
const async = require('async')
const _ = require('lodash')
const { prepareSubscribersCriteria, getScheduledTime } = require('../server/api/global/utility')
const { sendUsingBatchAPI } = require('../server/api/global/sendConversation')
const AutopostingDataLayer = require('../server/api/v1.1/autoposting/autoposting.datalayer')
const { facebookApiCaller } = require('../server/api/global/facebookApiCaller')
const AutoPostingMessage = require('../server/api/v1.1/autopostingMessages/autopostingMessages.datalayer')

exports.runRSSScript = () => {
  AutopostingDataLayer.findAllAutopostingObjectsUsingQuery({subscriptionType: 'rss', isActive: true})
    .then(autopostings => {
      autopostings.forEach(autoposting => {
        if (autoposting.scheduledTime &&
          new Date(autoposting.scheduledTime).getTime() <=
          new Date().getTime()) {
          let pagesFindCriteria = _pagesFindCriteria(autoposting)
          callApi(`pages/query`, 'post', pagesFindCriteria)
            .then(pages => {
              pages.forEach(page => {
                let data = {
                  autoposting: autoposting,
                  url: autoposting.subscriptionUrl,
                  page: page
                }
                async.series([
                  _performAction.bind(null, data),
                  _updateScheduledTime.bind(null, autoposting)
                ], function (err) {
                  if (err) {
                    const message = err || 'Failed to update subscriber in RSS Feed'
                    logger.serverLog(message, `${TAG}: runRSSScript`, autopostings, {}, 'error')
                  } else {
                  }
                })
              })
            })
            .catch(err => {
              const message = err || 'Failed to fetch pages'
              logger.serverLog(message, `${TAG}: runRSSScript`, autopostings, {}, 'error')
            })
        }
      })
    })
    .catch(err => {
      const message = err || 'Failed to fetch autoposting objects'
      logger.serverLog(message, `${TAG}: runRSSScript`, {}, {}, 'error')
    })
}

const _performAction = (data, next) => {
  if (data.autoposting.actionType === 'messenger') {
    async.series([
      _sendToMessenger.bind(null, data)
    ], function (err) {
      if (err) {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: _performAction`, {data}, {}, 'error')
        next(err)
      } else {
        next()
      }
    })
  } else if (data.autoposting.actionType === 'facebook') {
    async.series([
      _postOnFacebook.bind(null, data)
    ], function (err) {
      if (err) {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: _performAction`, {data}, {}, 'error')
        next(err)
      } else {
        next()
      }
    })
  } else {
    async.parallelLimit([
      _sendToMessenger.bind(null, data),
      _postOnFacebook.bind(null, data)
    ], 10, function (err) {
      if (err) {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: _performAction`, {data}, {}, 'error')
        next(err)
      } else {
        next()
      }
    })
  }
}

const _sendToMessenger = (data, next) => {
  async.series([
    _getSubscribersCount.bind(null, data),
    _sendRSSUpdates.bind(null, data)
  ], function (err) {
    if (err) {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _sendToMessenger`, {data}, {}, 'error')
      next(err)
    } else {
      next()
    }
  })
}

const _postOnFacebook = (data, next) => {
  async.series([
    _parseFeed.bind(null, data),
    _prepareMessageDataForFacebook.bind(null, data),
    _postRSSUpdatesOnFacebook.bind(null, data),
    _savePostObject.bind(null, data)
  ], function (err) {
    if (err) {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _postOnFacebook`, {data}, {}, 'error')
      next(err)
    } else {
      next()
    }
  })
}

const _savePostObject = (data, next) => {
  let newPost = {
    pageId: data.page._id,
    companyId: data.autoposting.companyId,
    autopostingType: 'rss',
    autopostingId: data.autoposting._id,
    post: data.messageData,
    postId: data.postId,
    likes: 0,
    comments: 0
  }
  callApi(`autoposting_fb_post`, 'post', newPost, 'kiboengage')
    .then(created => {
      next()
    })
    .catch(err => {
      const message = err || 'Failed to fetch autoposting objects'
      logger.serverLog(message, `${TAG}: _savePostObject`, data, {}, 'error')
      next(err)
    })
}

const _prepareMessageDataForFacebook = (data, next) => {
  let payload = {
  }
  let links = []
  if (data.feed.length === 1) {
    payload['link'] = data.feed[0].link
  } else {
    payload['link'] = `https://kibopush.com`
  }
  for (let i = 0; i < data.feed.length && i < 10; i++) {
    links.push(JSON.stringify({'link': data.feed[i].link, 'name': data.feed[i].title}))
  }
  payload['child_attachments'] = links
  data.messageData = payload
  next()
}

const _postRSSUpdatesOnFacebook = (data, next) => {
  facebookApiCaller('v3.3', `${data.page.pageId}/feed?access_token=${data.page.accessToken}`, 'post', data.messageData)
    .then(response => {
      if (response.body.error) {
        const message = response.body.error
        logger.serverLog(message, `${TAG}: _postRSSUpdatesOnFacebook`, data, {}, 'error')
        next(response.body.error)
      } else {
        data.postId = response.body.post_id ? response.body.post_id : response.body.id
        next()
      }
    })
    .catch(err => {
      const message = err || 'Failed to post on facebook'
      logger.serverLog(message, `${TAG}: _postRSSUpdatesOnFacebook`, data, {}, 'error')
      next(err)
    })
}

const _getSubscribersCount = (data, next) => {
  let subscribersData = [
    {$match: {pageId: data.page._id, companyId: data.page.companyId}},
    {$group: {_id: null, count: {$sum: 1}}}
  ]
  callApi('subscribers/aggregate', 'post', subscribersData)
    .then(subscribersCount => {
      data.subscribersCount = subscribersCount
      next()
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _getSubscribersCount`, {data}, {}, 'error')
      next(err)
    })
}

const _updateScheduledTime = (autoposting, next) => {
  AutopostingDataLayer.genericFindByIdAndUpdate(
    {_id: autoposting._id},
    {scheduledTime: getScheduledTime(autoposting.scheduledInterval)}
  )
    .then(autopostingUpdated => {
      next()
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _updateScheduledTime`, {autoposting}, {}, 'error')
      next(err)
    })
}

const _sendRSSUpdates = (data, next) => {
  async.series([
    _parseFeed.bind(null, data),
    _prepareMessageData.bind(null, data),
    _fetchTags.bind(null, data),
    _sendBroadcast.bind(null, data)
  ], function (err) {
    if (err) {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _sendRSSUpdates`, {data}, {}, 'error')
      next(err)
    } else {
      next()
    }
  })
}

const _sendBroadcast = (data, next) => {
  let reportObj = {
    successful: 0,
    unsuccessful: 0,
    errors: []
  }
  let subscriberCriteria = prepareSubscribersCriteria(
    {
      isList: false,
      isSegmented: data.autoposting.isSegmented,
      segmentationGender: data.autoposting.segmentationGender,
      segmentationLocale: data.autoposting.segmentationLocale
    },
    data.page
  )
  if (data.autoposting.segmentationTags.length > 0) {
    subscriberCriteria['_id'] = {$in: data.tagSubscriberIds}
  }
  sendUsingBatchAPI('autoposting', [data.messageData], subscriberCriteria, data.page, '', reportObj)
  let newMsg = {
    pageId: data.page._id,
    companyId: data.page.companyId,
    autoposting_type: 'rss',
    autopostingId: data.autoposting._id,
    sent: data.subscribersCount[0].count,
    message_id: 'messageCreativeId',
    payload: data.messageData,
    seen: 0,
    clicked: 0
  }
  AutoPostingMessage.createAutopostingMessage(newMsg)
    .then(savedMsg => {
      next()
    })
    .catch(err => {
      const message = err || 'Failed to create autoposting message'
      logger.serverLog(message, `${TAG}: _sendBroadcast`, data, {}, 'error')
      next(err)
    })
}

const _fetchTags = (data, next) => {
  if (data.autoposting.segmentationTags.length > 0) {
    callApi('tags/query', 'post', {companyId: data.page.companyId, tag: {$in: data.autoposting.segmentationTags}})
      .then(tags => {
        let tagIds = tags.map((t) => t._id)
        callApi(`tags_subscriber/query`, 'post', { tagId: { $in: tagIds } })
          .then(tagSubscribers => {
            if (tagSubscribers.length > 0) {
              data.tagSubscriberIds = tagSubscribers.map((ts) => ts.subscriberId._id)
              next()
            } else {
              next()
            }
          })
          .catch(err => {
            const message = err || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: _fetchTags`, {data}, {}, 'error')
            next(err)
          })
      })
      .catch(err => {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: _fetchTags`, {data}, {}, 'error')
        next(err)
      })
  } else {
    next()
  }
}

const _parseFeed = (data, next) => {
  feedparser.parse(data.url)
    .then(feed => {
      data.feed = feed
      next()
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _parseFeed`, {data}, {}, 'error')
      next(err)
    })
}

const _prepareMessageData = (data, next) => {
  getMetaData(data.feed)
    .then(gallery => {
      let messageData = {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: gallery
          }
        }
      }
      data.messageData = messageData
      next()
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _prepareMessageData`, {data}, {}, 'error')
      next(err)
    })
}

function getMetaData (feed) {
  return new Promise((resolve, reject) => {
    let gallery = []
    let length = feed.length < 10 ? feed.length : 10
    for (let i = 0; i < length; i++) {
      og(feed[i].link, (err, meta) => {
        if (err) {
          const message = err || 'error in fetching metadata'
          logger.serverLog(message, `${TAG}: getMetaData`, feed, {}, 'error')
        }
        if (meta && meta.title && meta.image) {
          gallery.push({
            title: meta.title,
            subtitle: 'kibopush.com',
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

const _pagesFindCriteria = function (postingItem) {
  let pagesFindCriteria = {
    companyId: postingItem.companyId,
    connected: true
  }

  if (postingItem.isSegmented) {
    if (postingItem.segmentationPageIds && postingItem.segmentationPageIds.length > 0) {
      pagesFindCriteria = _.merge(pagesFindCriteria, {
        pageId: {
          $in: postingItem.segmentationPageIds
        }
      })
    }
  }
  return pagesFindCriteria
}
