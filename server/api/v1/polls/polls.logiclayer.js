const mongoose = require('mongoose')
let _ = require('lodash')

exports.prepareResponsesPayload = function (polls, responsesCount1) {
  let responsesCount = []
  for (let i = 0; i < polls.length; i++) {
    responsesCount.push({
      _id: polls[i]._id,
      count: 0
    })
  }
  for (let i = 0; i < polls.length; i++) {
    for (let j = 0; j < responsesCount1.length; j++) {
      if (polls[i]._id.toString() === responsesCount1[j]._id.pollId.toString()) {
        responsesCount[i].count = responsesCount1[j].count
      }
    }
  }
  return responsesCount
}
exports.getCriterias = function (body, companyUser) {
  let startDate = new Date() // Current date
  startDate.setDate(startDate.getDate() - body.days)
  startDate.setHours(0) // Set the hour, minute and second components to 0
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let findCriteria = {
    companyId: companyUser.companyId,
    'datetime': body.days !== '0' ? {
      $gte: startDate
    } : {$exists: true}
  }
  let finalCriteria = {}
  let recordsToSkip = 0
  if (body.first_page === 'first') {
    finalCriteria = [
      { $match: findCriteria },
      { $sort: {datetime: -1} },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'next') {
    recordsToSkip = Math.abs(((body.requested_page - 1) - (body.current_page))) * body.number_of_records
    finalCriteria = [
      { $match: { $and: [findCriteria, { _id: { $lt: mongoose.Types.ObjectId(body.last_id) } }] } },
      { $sort: {datetime: -1} },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs(((body.requested_page) - (body.current_page - 1))) * body.number_of_records
    finalCriteria = [
      { $match: { $and: [findCriteria, { _id: { $gt: mongoose.Types.ObjectId(body.last_id) } }] } },
      { $sort: {datetime: 1} },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  }
  let countCriteria = [
    { $match: findCriteria },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]
  return {countCriteria: countCriteria, fetchCriteria: finalCriteria}
}
exports.preparePollsPayload = function (user, companyUser, body) {
  let pollPayload = {
    platform: 'facebook',
    statement: body.statement,
    options: body.options,
    companyId: companyUser.companyId,
    userId: user._id
  }
  if (body.isSegmented) {
    pollPayload.isSegmented = true
    pollPayload.segmentationPageIds = (body.segmentationPageIds)
      ? body.segmentationPageIds
      : null
    pollPayload.segmentationGender = (body.segmentationGender)
      ? body.segmentationGender
      : null
    pollPayload.segmentationLocale = (body.segmentationLocale)
      ? body.segmentationLocale
      : null
    pollPayload.segmentationTags = (body.segmentationTags)
      ? body.segmentationTags
      : null
    pollPayload.segmentationPoll = (body.segmentationPoll)
      ? body.segmentationPoll
      : null
  }
  if (body.isList) {
    pollPayload.isList = true
    pollPayload.segmentationList = (body.segmentationList)
      ? body.segmentationList
      : null
  }
  return pollPayload
}
exports.pagesFindCriteria = function (companyUser, body) {
  let pagesFindCriteria = {companyId: companyUser.companyId, connected: true}
  if (body.isSegmented) {
    if (body.segmentationPageIds.length > 0) {
      pagesFindCriteria = _.merge(pagesFindCriteria, {
        pageId: {
          $in: body.segmentationPageIds
        }
      })
    }
  }
  return pagesFindCriteria
}
exports.ListFindCriteria = function (body) {
  let ListFindCriteria = {}
  ListFindCriteria = _.merge(ListFindCriteria,
    {
      _id: {
        $in: body.segmentationList
      }
    })
  return ListFindCriteria
}
exports.subsFindCriteria = function (lists, page) {
  let subsFindCriteria = {pageId: page._id}
  let listData = []
  if (lists.length > 1) {
    for (let i = 0; i < lists.length; i++) {
      for (let j = 0; j < lists[i].content.length; j++) {
        if (exists(listData, lists[i].content[j]) === false) {
          listData.push(lists[i].content[j])
        }
      }
    }
    subsFindCriteria = _.merge(subsFindCriteria, {
      _id: {
        $in: listData
      }
    })
  } else {
    subsFindCriteria = _.merge(subsFindCriteria, {
      _id: {
        $in: lists[0].content
      }
    })
  }
  return subsFindCriteria
}
exports.subscriberFindCriteria = function (page, body) {
  let subscriberFindCriteria = {pageId: page._id, isSubscribed: true}
  if (body.isSegmented) {
    if (body.segmentationGender.length > 0) {
      subscriberFindCriteria = _.merge(subscriberFindCriteria, {
        gender: {
          $in: body.segmentationGender
        }
      })
    }
    if (body.segmentationLocale.length > 0) {
      subscriberFindCriteria = _.merge(subscriberFindCriteria, {
        locale: {
          $in: body.segmentationLocale
        }
      })
    }
  }
  return subscriberFindCriteria
}
exports.prepareMessageData = function (body, id) {
  let messageData = {
    text: body.statement,
    quick_replies: [
      {
        'content_type': 'text',
        'title': body.options[0],
        'payload': JSON.stringify(
          {poll_id: id, option: body.options[0]})
      },
      {
        'content_type': 'text',
        'title': body.options[1],
        'payload': JSON.stringify(
          {poll_id: id, option: body.options[1]})
      },
      {
        'content_type': 'text',
        'title': body.options[2],
        'payload': JSON.stringify(
          {poll_id: id, option: body.options[2]})
      }
    ]
  }
  return messageData
}
function exists (list, content) {
  for (let i = 0; i < list.length; i++) {
    if (JSON.stringify(list[i]) === JSON.stringify(content)) {
      return true
    }
  }
  return false
}
exports.preparePollPagePayload = function (page, user, companyUser, body, subscriber, id) {
  let pollBroadcast = {
    pageId: page.pageId,
    userId: user._id,
    companyId: companyUser.companyId,
    subscriberId: subscriber.senderId,
    pollId: id,
    seen: false
  }
  return pollBroadcast
}
