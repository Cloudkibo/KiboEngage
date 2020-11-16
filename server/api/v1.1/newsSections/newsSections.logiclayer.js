const request = require('request')
const async = require('async')
const {domainName, openGraphScrapper} = require('../../global/utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/rssFeeds/rssFeeds.logiclayer.js'

exports.fetchFeedsCriteria = function (body, companyId) {
  let finalCriteria = {}
  let countCriteria = {}
  let recordsToSkip = 0
  let findCriteria = {
    companyId: companyId,
    title: body.search_value !== '' ? { $regex: body.search_value, $options: 'i' } : { $exists: true },
    defaultFeed: body.type_value !== '' ? body.type_value === 'default' : { $exists: true },
    integrationType: body.integrationType
  }
  if (body.status_value !== '') {
    findCriteria['isActive'] = body.status_value === 'true'
  }
  if (body.page_value !== '') {
    findCriteria['pageIds'] = body.page_value
  }
  if (body.first_page === 'first') {
    finalCriteria = [
      { $match: findCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'next') {
    recordsToSkip = Math.abs(((body.requested_page - 1) - (body.current_page))) * body.number_of_records
    let finalFindCriteria = {}
    Object.assign(finalFindCriteria, findCriteria)
    finalFindCriteria._id = { $lt: body.last_id }
    finalCriteria = [
      { $match: finalFindCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs(body.requested_page * body.number_of_records)
    let finalFindCriteria = {}
    Object.assign(finalFindCriteria, findCriteria)
    finalFindCriteria._id = { $gt: body.last_id }
    finalCriteria = [
      { $match: finalFindCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  }
  countCriteria = [
    { $match: findCriteria },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]
  return {
    finalCriteria,
    countCriteria
  }
}

exports.getCriterias = function (body) {
  let startDate = new Date(body.startDate)
  let endDate = new Date(body.endDate)
  let finalCriteria = [
    { $lookup: { from: 'newspostsubscribers', localField: '_id', foreignField: 'newsPostId', as: 'newsPost' } },
    { $unwind: '$newsPost' },
    {$group: {
      _id: '$_id',
      seen: {$sum: {$cond: ['$newsPost.seen', 1, 0]}},
      sent: {$sum: {$cond: ['$newsPost.sent', 1, 0]}},
      clicked: {$sum: {$cond: ['$newsPost.clicked', 1, 0]}},
      newsSectionId: { '$first': '$newsSectionId' },
      pageId: {'$first': '$pageId'},
      companyId: {'$first': '$companyId'},
      datetime: {'$first': '$datetime'}
    }},
    { $project:
         {
           year: { $year: '$datetime' },
           month: { $month: '$datetime' },
           day: { $dayOfMonth: '$datetime' },
           pageId: 1,
           newsSectionId: 1,
           datetime: 1,
           companyId: 1
         }
    }
  ]
  let countCriteria = [
    { $project:
         {
           doc: '$$ROOT',
           year: { $year: '$datetime' },
           month: { $month: '$datetime' },
           day: { $dayOfMonth: '$datetime' },
           pageId: 1,
           newsSectionId: 1,
           datetime: 1,
           companyId: 1
         }
    }
  ]
  let recordsToSkip = 0
  let findCriteria = {
    newsSectionId: body.feedId,
    pageId: body.page_value && body.page_value !== '' ? body.page_value : { $exists: true }
  }
  if (body.startDate && body.startDate !== '' && body.endDate && body.endDate !== '') {
    findCriteria.month = {
      $gte: startDate.getUTCMonth() + 1,
      $lte: endDate.getUTCMonth() + 1
    }
    findCriteria.day = {
      $gte: startDate.getUTCDate(),
      $lte: endDate.getUTCDate()
    }
    findCriteria.year = {
      $gte: startDate.getUTCFullYear(),
      $lte: endDate.getUTCFullYear()
    }
  }
  if (body.first_page === 'first') {
    finalCriteria.push(
      { $match: findCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    )
  } else if (body.first_page === 'next') {
    recordsToSkip = Math.abs(((body.requested_page - 1) - (body.current_page))) * body.number_of_records
    let finalFindCriteria = {}
    Object.assign(finalFindCriteria, findCriteria)
    finalFindCriteria._id = { $lt: body.last_id }
    finalCriteria.push(
      { $match: finalFindCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    )
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs(body.requested_page * body.number_of_records)
    let finalFindCriteria = {}
    Object.assign(finalFindCriteria, findCriteria)
    finalFindCriteria._id = { $gt: body.last_id }
    finalCriteria.push(
      { $match: finalFindCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    )
  }
  countCriteria.push({ $match: findCriteria })

  return {
    finalCriteria,
    countCriteria
  }
}

exports.getMetaData = function (feed, body, page) {
  return new Promise((resolve, reject) => {
    let gallery = []
    let length = body.storiesCount ? body.storiesCount : feed.length
    async.eachOfSeries(feed, function (value, key, callback) {
      if (key < length) {
        let valueGot = Object.keys(value).length > 0 && value.constructor === Object ? value.link : value
        openGraphScrapper(valueGot)
          .then(meta => {
            if (meta && meta.ogTitle) {
              gallery.push({
                title: meta.ogTitle,
                subtitle: meta.ogDescription ? meta.ogDescription : domainName(valueGot),
                image_url: meta.ogImage && meta.ogImage.url ? meta.ogImage.url.constructor === Array ? meta.ogImage.url[0] : meta.ogImage.url : page.pagePic,
                buttons: [
                  {
                    type: 'web_url',
                    title: 'Read More...',
                    url: valueGot
                  }
                ]
              })
              callback()
            } else {
              callback()
            }
          })
          .catch(err => {
            const message = err || 'Error from open graph'
            logger.serverLog(message, `${TAG}: exports.getMetaData`, {feed, body, page}, {}, 'error')
          })
      } else {
        callback()
      }
    }, function (err) {
      if (err) {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.getMetaData`, {feed, body, page}, {}, 'error')
        reject(err)
      } else {
        resolve(gallery)
      }
    })
  })
}

exports.prepareBatchData = function (subscriber, messageData) {
  return new Promise((resolve, reject) => {
    let batch = []
    let recipient = 'recipient=' + encodeURIComponent(JSON.stringify({'id': subscriber.subscriberId}))
    let tag = 'tag=' + encodeURIComponent('NON_PROMOTIONAL_SUBSCRIPTION')
    let messagingType = 'messaging_type=' + encodeURIComponent('MESSAGE_TAG')
    messageData.forEach((item, index) => {
      let message = 'message=' + encodeURIComponent(JSON.stringify(item))
      if (index === 0) {
        batch.push({ 'method': 'POST', 'name': `${subscriber.subscriberId}${index + 1}`, 'relative_url': 'v4.0/me/messages', 'body': recipient + '&' + message + '&' + messagingType + '&' + tag })
      } else {
        batch.push({ 'method': 'POST', 'name': `${subscriber.subscriberId}${index + 1}`, 'depends_on': `${subscriber.subscriberId}${index}`, 'relative_url': 'v4.0/me/messages', 'body': recipient + '&' + message + '&' + messagingType + '&' + tag })
      }
    })
    resolve(JSON.stringify(batch))
  })
}
exports.callBatchAPI = (page, batch) => {
  return new Promise((resolve, reject) => {
    const r = request.post('https://graph.facebook.com', (err, httpResponse, body) => {
      if (err) {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.callBatchAPI`, {page, batch}, {}, 'error')
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
