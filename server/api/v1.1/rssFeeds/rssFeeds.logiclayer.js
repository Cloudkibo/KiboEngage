const og = require('open-graph')
const request = require('request')

exports.fetchFeedsCriteria = function (body, companyId) {
  let finalCriteria = {}
  let countCriteria = {}
  let recordsToSkip = 0
  let findCriteria = {
    companyId: companyId,
    title: body.search_value !== '' ? { $regex: body.search_value, $options: 'i' } : { $exists: true }
  }
  if (body.status_value !== '') {
    findCriteria['isActive'] = body.status_value === 'true' ? true : false
  }
  if (body.page_value !== '') {
    findCriteria['pageIds'] = body.page_value
  }
  console.log('Number of records', body.number_of_records)
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
  let startDate = new Date(body.startDate) // Current date
  startDate.setHours(0) // Set the hour, minute and second components to 0
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let endDate = new Date(body.endDate) // Current date
  endDate.setDate(endDate.getDate() + 1)
  endDate.setHours(0) // Set the hour, minute and second components to 0
  endDate.setMinutes(0)
  endDate.setSeconds(0)
  let finalCriteria = [
    { $lookup: { from: 'rssfeedpostsubscribers', localField: '_id', foreignField: 'rssFeedPostId', as: 'rssFeedPost' } },
    { $unwind: '$rssFeedPost' },
    {$group: {
      _id: '$_id',
      seen: {$sum: {$cond: ['$rssFeedPost.seen', 1, 0]}},
      sent: {$sum: {$cond: ['$rssFeedPost.sent', 1, 0]}},
      clicked: {$sum: {$cond: ['$rssFeedPost.clicked', 1, 0]}},
      rssFeedId: { '$first': '$rssFeedId' },
      pageId: {'$first': '$pageId'},
      companyId: {'$first': '$companyId'},
      datetime: {'$first': '$datetime'}
    }}
  ]
  let countCriteria = [
    { $lookup: { from: 'rssfeedpostsubscribers', localField: '_id', foreignField: 'rssFeedPostId', as: 'rssFeedPost' } },
    { $unwind: '$rssFeedPost' },
    {$group: {
      _id: '$_id',
      seen: {$sum: {$cond: ['$rssFeedPost.seen', 1, 0]}},
      sent: {$sum: {$cond: ['$rssFeedPost.sent', 1, 0]}},
      clicked: {$sum: {$cond: ['$rssFeedPost.clicked', 1, 0]}},
      rssFeedId: { '$first': '$rssFeedId' },
      pageId: {'$first': '$pageId'},
      companyId: {'$first': '$companyId'},
      datetime: {'$first': '$datetime'}
    }}
  ]
  let recordsToSkip = 0
  let findCriteria = {
    rssFeedId: body.feedId,
    'datetime': body.startDate && body.startDate !== '' && body.endDate && body.endDate !== '' ? {
      $gte: startDate,
      $lt: endDate
    } : { $exists: true },
    pageId: body.page_value && body.page_value !== '' ? body.page_value : { $exists: true }
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

exports.getMetaData = function(feed, body) {
  return new Promise((resolve, reject) => {
    let gallery = []
    let length = body.storiesCount
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

exports.prepareBatchData = function (subscriber, messageData) {
  return new Promise((resolve, reject) => {
    console.log('In prepare batch data', JSON.stringify(messageData))
    console.log('In prepare batch data', JSON.stringify(subscriber))
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
      console.log('body', body)
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
