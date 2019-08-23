const { callApi } = require('../server/api/v1.1/utility')
const logger = require('../server/components/logger')
const TAG = 'scripts/rssScript.js'
const og = require('open-graph')
const feedparser = require('feedparser-promised')
const async = require('async')
const _ = require('lodash')
const broadcastApi = require('../server/api/global/broadcastApi')
const { getScheduledTime } = require('../server/api/global/utility')
const AutopostingDataLayer = require('../server/api/v1.1/autoposting/autoposting.datalayer')

exports.runRSSScript = () => {
  callApi(`autoposting/`, 'get', {}, 'kiboengage')
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
                  _getSubscribersCount.bind(null, data),
                  _sendRSSUpdates.bind(null, data),
                  _updateScheduledTime.bind(null, autoposting)
                ], function (err) {
                  if (err) {
                    logger.serverLog(TAG, `Failed to send rss updates. ${JSON.stringify(err)}`)
                  } else {
                    logger.serverLog(TAG, `RSS updates sent Successfullyf for url ${autoposting.subscriptionUrl}`)
                  }
                })
              })
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to fetch pages ${JSON.stringify(err)}`, 'error')
            })
        }
      })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch autoposting objects ${err}`, 'error')
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
      next(err)
    })
}

const _sendRSSUpdates = (data, next) => {
  async.series([
    _parseFeed.bind(null, data),
    _prepareMessageData.bind(null, data),
    _createMessageCreative.bind(null, data),
    _fetchTags.bind(null, data),
    _sendBroadcast.bind(null, data)
  ], function (err) {
    if (err) {
      next(err)
    } else {
      next()
    }
  })
}

const _sendBroadcast = (data, next) => {
  const limit = Math.ceil(data.subscribersCount[0].count / 10000)
  for (let i = 0; i < limit; i++) {
    let labels = []
    let unsubscribeTag = data.pageTags.filter((pt) => pt.tag === `_${data.page.pageId}_unsubscribe`)
    let pageIdTag = data.pageTags.filter((pt) => pt.tag === `_${data.page.pageId}_${i + 1}`)
    let notlabels = unsubscribeTag.length > 0 && [unsubscribeTag[0].labelFbId]
    pageIdTag.length > 0 && labels.push(pageIdTag[0].labelFbId)
    if (data.autoposting.segmentationGender.length > 0) {
      let temp = data.pageTags.filter((pt) => data.autoposting.segmentationGender.includes(pt.tag)).map((pt) => pt.labelFbId)
      labels = labels.concat(temp)
    }
    if (data.autoposting.segmentationLocale.length > 0) {
      let temp = data.pageTags.filter((pt) => data.autoposting.segmentationLocale.includes(pt.tag)).map((pt) => pt.labelFbId)
      labels = labels.concat(temp)
    }
    if (data.autoposting.segmentationTags.length > 0) {
      let temp = data.pageTags.filter((pt) => data.autoposting.segmentationTags.includes(pt._id)).map((pt) => pt.labelFbId)
      labels = labels.concat(temp)
    }
    broadcastApi.callBroadcastMessagesEndpoint(data.messageCreativeId, labels, notlabels, data.page.accessToken)
      .then(response => {
        if (i === limit - 1) {
          if (response.status === 'success') {
            next()
          } else {
            next('Failed to send broadcast.')
          }
        }
      })
      .catch(err => {
        next(err)
      })
  }
}

const _fetchTags = (data, next) => {
  callApi('tags/query', 'post', {companyId: data.page.companyId, pageId: data.page._id})
    .then(pageTags => {
      data.pageTags = pageTags
      next()
    })
    .catch(err => {
      next(err)
    })
}

const _createMessageCreative = (data, next) => {
  broadcastApi.callMessageCreativesEndpoint(data.messageData, data.page.accessToken, 'autoposting')
    .then(messageCreative => {
      if (messageCreative.status === 'success') {
        data.messageCreativeId = messageCreative.message_creative_id
        next()
      } else {
        next('Failed to send broadcast.')
      }
    })
    .catch(err => {
      next(err)
    })
}

const _parseFeed = (data, next) => {
  feedparser.parse(data.url)
    .then(feed => {
      data.feed = feed
      next()
    })
    .catch(err => {
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
      next(err)
    })
}

function getMetaData (feed) {
  return new Promise((resolve, reject) => {
    let gallery = []
    for (let i = 0; i < feed.length; i++) {
      og(feed[i].link, (err, meta) => {
        if (err) {
          logger.serverLog(TAG, 'error in fetching metdata', 'error')
        }
        if (meta && meta.title && meta.image) {
          gallery.push({
            title: meta.title,
            subtitle: 'kibopush.com',
            image_url: meta.image.url.constructor === Array ? meta.image.url[0] : meta.image.url,
            buttons: [
              {
                type: 'element_share'
              },
              {
                type: 'web_url',
                title: 'Read More...',
                url: feed[i].link
              }
            ]
          })
        }
        if (i === feed.length - 1 || i === 9) {
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
