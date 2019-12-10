/*
This file will contain the functions for logic layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const URL = require('url')

exports.getCriterias = function (body, companyId) {
  let startDate = new Date(body.startDate) // Current date
  startDate.setHours(0) // Set the hour, minute and second components to 0
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let endDate = new Date(body.endDate) // Current date
  endDate.setHours(0) // Set the hour, minute and second components to 0
  endDate.setMinutes(0)
  endDate.setSeconds(0)
  let finalCriteria = {}
  let countCriteria = {}
  let recordsToSkip = 0
  let findCriteria = {
    companyId: companyId,
    'datetime': body.startDate !== '' ? {
      $gte: startDate,
      $lt: endDate
    } : { $exists: true },
    title: body.search_value !== '' ? { $regex: body.search_value, $options: 'i' } : { $exists: true }
  }
  if (body.type_value === 'any') {
    findCriteria['payload.0'] = { $exists: false }
    findCriteria['post_id'] = { $exists: false }
  } else if (body.type_value === 'new') {
    findCriteria['payload.0'] = { $exists: true }
    findCriteria['post_id'] = { $exists: true }
  } else if (body.type_value === 'existing') {
    findCriteria['payload.0'] = { $exists: false }
    findCriteria['post_id'] = { $exists: true }
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

exports.getCountForComments = (body) => {
  let aggregateData = [
    { $match: {postId: body.postId, parentId: {$exists: false}} },
    { $group: {_id: null, count: { $sum: 1 }} }
  ]
  if (body.post_id && body.post_id !== '') {
    aggregateData[0].$match.postFbId = body.post_id
  }
  return aggregateData
}

exports.getComments = (body) => {
  let aggregateData = [
    { $match: {postId: body.postId, parentId: {$exists: false}} },
    { $sort: {_id: body.sort_value} },
    { $match: {
      '_id': body.first_page ? {$exists: true} : body.sort_value === -1 ? {$lt: body.last_id} : {$gt: body.last_id}
    } },
    { $limit: body.number_of_records }
  ]
  if (body.post_id && body.post_id !== '') {
    aggregateData[0].$match.postFbId = body.post_id
  }
  return aggregateData
}

exports.getCountForReplies = (body) => {
  let aggregateData = [
    { $match: {parentId: body.commentId} },
    { $group: {_id: null, count: { $sum: 1 }} }
  ]
  return aggregateData
}

exports.getReplies = (body) => {
  let aggregateData = [
    { $match: {parentId: body.commentId} },
    { $sort: {_id: body.sort_value} },
    { $match: {
      '_id': body.first_page ? {$exists: true} : body.sort_value === -1 ? {$lt: body.last_id} : {$gt: body.last_id}
    } },
    { $limit: body.number_of_records }
  ]
  return aggregateData
}

exports.setMessage = function (payload) {
  let messageData = {}
  payload.map(payloadItem => {
    if (payloadItem.componentType === 'text') {
      messageData.message = payloadItem.text
    } else if (payloadItem.componentType === 'image') {
      messageData.image = true
      messageData.url = payloadItem.url
    } else if (payloadItem.componentType === 'video') {
      messageData.description = messageData.message
      messageData.video = true
      messageData.file_url = payloadItem.url
    }
  })
  return messageData
}
exports.getAggregateQuery = function (companyId) {
  var aggregateQuery = {
    match: { companyId: companyId },
    group: { _id: '$companyId',
      count: { $sum: 1 },
      totalComments: { $sum: '$count' },
      totalRepliesSent: { $sum: '$positiveMatchCount' },
      conversions: {$sum: '$conversionCount'},
      waitingConversions: {$sum: '$waitingReply'}
    }
  }
  return aggregateQuery
}
exports.getPostId = function (url) {
  let postId = ''
  let pathname
  let result = URL.parse(url)
  if (result.host === 'www.facebook.com' && result.query && result.pathname) {
    let query = result.query.split('&')
    if (query && query.length > 0) {
      for (let i = 0; i < query.length; i++) {
        if (query[i].includes('fbid=')) {
          postId = query[i].substring(query[i].indexOf('fbid=') + 5)
          break
        } else if (query[i].includes('v=')) {
          postId = query[i].substring(query[i].indexOf('v=') + 2)
          break
        } else {
          pathname = result.pathname.split('/')
          if (pathname[pathname.length - 1] !== '') {
            postId = pathname[pathname.length - 1]
            break
          } else {
            postId = pathname[pathname.length - 2]
            break
          }
        }
      }
    }
  }
  return postId
}
exports.preparePayloadToPost = function (payload) {
  let textComponents = payload.filter(item => item.componentType === 'text')
  let linkComponents = payload.filter(item => item.componentType === 'link')
  let imageComponents = payload.filter(item => item.componentType === 'image')
  let videoComponents = payload.filter(item => item.componentType === 'video')
  if (imageComponents.length > 0) {
    payload = handleImage(imageComponents, textComponents)
    return payload
  } else if (videoComponents.length > 0) {
    payload = handleVideo(videoComponents, textComponents)
    return payload
  } else {
    payload = handleTextAndLinks(textComponents, linkComponents)
    return payload
  }
}
function handleImage (imageComponents, textComponents) {
  let payload = {}
  if (imageComponents.length === 1) {
    payload = {
      type: 'image',
      payload: {
        'url': imageComponents[0].url
      }
    }
    if (textComponents.length > 0) {
      payload.payload.caption = textComponents[0].text
    }
  } else if (imageComponents.length > 1) {
    let links = []
    for (let i = 0; i < imageComponents.length && i < 10; i++) {
      links.push({'link': imageComponents[i].url})
    }
    payload = {
      type: 'images',
      payload: {
        'link': `https://kibopush.com`,
        'child_attachments': links
      }
    }
    if (textComponents.length > 0) {
      payload.payload.message = textComponents[0].text
    }
  }
  return payload
}

function handleTextAndLinks (textComponents, linkComponents) {
  let payload
  if (linkComponents.length > 0) {
    payload = handleLinks(textComponents, linkComponents)
    return payload
  } else {
    payload = handleText(textComponents)
    return payload
  }
}
function handleText (textComponents) {
  let payload = {
    type: 'text',
    payload: {
      'message': textComponents[0].text
    }
  }
  let urls = getMetaUrls(textComponents[0])
  if (urls && urls.length > 0) {
    if (urls && urls.length === 1) {
      payload.payload['link'] = urls[0]
    } else if (urls && urls.length > 1) {
      payload.payload['link'] = `https://kibopush.com`
      let links = []
      for (let i = 0; i < urls.length && i < 10; i++) {
        links.push({'link': urls[i]})
      }
      payload.payload['child_attachments'] = links
    }
  }
  return payload
}
function handleLinks (textComponents, linkComponents) {
  let payload = {}
  if (linkComponents.length === 1) {
    payload = {
      type: 'text',
      payload: {
        'link': linkComponents[0].url
      }
    }
    if (textComponents.length > 0) {
      payload.payload.message = textComponents[0].text
    }
  } else if (linkComponents.length > 1) {
    let links = []
    for (let i = 0; i < linkComponents.length && i < 10; i++) {
      links.push({'link': linkComponents[i].url})
    }
    payload = {
      type: 'text',
      payload: {
        'link': `https://kibopush.com`,
        'child_attachments': links
      }
    }
    if (textComponents.length > 0) {
      payload.payload.message = textComponents[0].text
    }
  }
  return payload
}
function getMetaUrls (text) {
  /* eslint-disable */
  var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig
  /* eslint-enable */
  var testUrl = text.text.match(urlRegex)
  return testUrl
}

function handleVideo (videoComponents, textComponents) {
  let payload = {
    type: 'video',
    payload: {
      'file_url': videoComponents[0].url
    }
  }
  if (textComponents.length > 0) {
    payload.payload.description = textComponents[0].text
  }
  return payload
}

exports.getCriteriasToFilterComments = function (body, companyId) {
  let startDate = new Date(body.startDate) // Current date
  startDate.setHours(0) // Set the hour, minute and second components to 0
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let endDate = new Date(body.endDate) // Current date
  // endDate.setHours(0) // Set the hour, minute and second components to 0
  // endDate.setMinutes(0)
  // endDate.setSeconds(0)
  let findCriteria = {
    postId: body.postId,
    'datetime': body.startDate && body.startDate !== '' ? {
      $gte: startDate,
      $lt: endDate
    } : { $exists: true }
  }
  if (body.search_value && body.search_value !== '') {
    findCriteria['$or'] = [
      {'commentPayload.0.text': { $regex: body.search_value, $options: 'i' }},
      {'commentPayload.1.text': { $regex: body.search_value, $options: 'i' }}
    ]
  }
  let aggregateQuery = [
    { $match: findCriteria },
    { $sort: {_id: body.sort_value} },
    { $match: {
      '_id': body.first_page ? {$exists: true} : body.sort_value === -1 ? {$lt: body.last_id} : {$gt: body.last_id}
    } },
    { $limit: body.number_of_records }
  ]
  let countQuery = [
    { $match: findCriteria },
    { $group: {_id: null, count: { $sum: 1 }} }
  ]
  return {
    aggregateQuery,
    countQuery
  }
}

exports.handleVideo = handleVideo
exports.getMetaUrls = getMetaUrls
exports.handleText = handleText
exports.handleTextAndLinks = handleTextAndLinks
exports.handleLinks = handleLinks
exports.handleImage = handleImage
