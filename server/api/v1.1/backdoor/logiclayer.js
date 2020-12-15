const moment = require('moment')

exports.getCriterias = function (body) {
  let findCriteria = {
    role: 'buyer'
  }
  let findCriteriaPlatform = {}
  let finalCriteria = {}
  let search = '.*' + body.filter_criteria.search_value + '.*'
  if (body.filter_criteria.search_value !== '') {
    findCriteria = Object.assign(findCriteria, {name: {$regex: search, $options: 'i'}})
  }
  if (body.filter_criteria.locale_value !== '' && body.filter_criteria.locale_value !== 'all') {
    findCriteria = Object.assign(findCriteria, {'facebookInfo.locale': body.filter_criteria.locale_value})
  }
  if (body.filter_criteria.gender_value !== '' && body.filter_criteria.gender_value !== 'all') {
    findCriteria = Object.assign(findCriteria, {'facebookInfo.gender': body.filter_criteria.gender_value})
  }
  if (body.filter_criteria.platform_value !== '' && body.filter_criteria.platform_value === 'messenger') {
    findCriteria = Object.assign(findCriteria, {'connectFacebook': true})
  }
  if (body.filter_criteria.platform_value !== '' && body.filter_criteria.platform_value === 'sms') {
    findCriteriaPlatform = Object.assign(findCriteriaPlatform, {'companyId.twilio': {$exists: true}})
  }
  if (body.filter_criteria.platform_value !== '' && body.filter_criteria.platform_value === 'whatsApp') {
    findCriteriaPlatform.$and = [{'companyId.whatsApp': {$exists: true}}, {'companyId.whatsApp.connected': true}]
  }
  if (body.filter_criteria.platform_value === 'none') {
    findCriteriaPlatform.$and = [
      {'connectFacebook': false},
      { $or: [
        {'companyId.whatsApp': {$exists: false}},
        {'companyId.whatsApp.connected': false}
      ]},
      {'companyId.twilio': {$exists: false}}
    ]
  }
  if (body.first_page) {
    finalCriteria = [
      { $match: findCriteria },
      { $lookup: { from: 'companyprofiles', localField: '_id', foreignField: 'ownerId', as: 'companyId' } },
      { '$unwind': '$companyId' },
      { $match: findCriteriaPlatform },
      { $sort: { createdAt: -1 } },
      { $limit: body.number_of_records }
    ]
  } else {
    finalCriteria = [
      { $match: {$and: [findCriteria, {_id: {$lt: body.last_id}}]} },
      { $lookup: { from: 'companyprofiles', localField: '_id', foreignField: 'ownerId', as: 'companyId' } },
      { '$unwind': '$companyId' },
      { $match: findCriteriaPlatform },
      { $sort: { createdAt: -1 } },
      { $limit: body.number_of_records }
    ]
  }
  let countCriteria = [
    { $match: findCriteria },
    { $lookup: { from: 'companyprofiles', localField: '_id', foreignField: 'ownerId', as: 'companyId' } },
    { '$unwind': '$companyId' },
    { $match: findCriteriaPlatform },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]
  return {
    countCriteria,
    findCriteria,
    finalCriteria
  }
}
exports.getAllPagesCriteria = function (userid, body) {
  let search = '.*' + body.search_value + '.*'
  let findCriteria = {
    userId: userid,
    pageName: body.search_value !== '' ? {$regex: search, $options: 'i'} : {$exists: true}
  }
  let recordsToSkip = 0
  let finalCriteria = {}
  let countCriteria = [
    { $match: findCriteria },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]
  if (body.first_page === 'first') {
    finalCriteria = [
      { $match: findCriteria },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'next') {
    recordsToSkip = Math.abs(((body.requested_page - 1) - (body.current_page))) * body.number_of_records
    finalCriteria = [
      { $match: {$and: [findCriteria, {_id: {$gt: body.last_id}}]} },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs(((body.requested_page) - (body.current_page - 1))) * body.number_of_records
    finalCriteria = [
      { $match: {$and: [findCriteria, {_id: {$lt: body.last_id}}]} },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  }
  return {
    countCriteria,
    finalCriteria
  }
}

exports.getSubscribersCountForPages = function (page) {
  let countCriteria = [
    { $match: {pageId: page._id} },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]
  return countCriteria
}

exports.allUserBroadcastsCriteria = function (userid, body) {
  let findCriteria = {}
  let finalCriteria = {}
  let countCriteria = {}
  let recordsToSkip = 0
  if (body.filter_criteria.search_value === '' && body.filter_criteria.type_value === '') {
    findCriteria = {
      userId: userid
    }
  } else {
    if (body.filter_criteria.type_value === 'miscellaneous') {
      findCriteria = {
        userId: userid,
        'payload.1': { $exists: true },
        title: body.filter_criteria.search_value !== '' ? { $regex: '.*' + body.filter_criteria.search_value + '.*', $options: 'i' } : { $exists: true }
      }
    } else {
      findCriteria = {
        userId: userid,
        $and: [{'payload.0.componentType': body.filter_criteria.type_value !== '' ? body.filter_criteria.type_value : { $exists: true }}, {'payload.1': { $exists: false }}],
        title: body.filter_criteria.search_value !== '' ? { $regex: '.*' + body.filter_criteria.search_value + '.*', $options: 'i' } : { $exists: true }
      }
    }
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
exports.getAllBroadcastsCriteria = function (body) {
  let findCriteria = {}
  let startDate = new Date() // Current date
  startDate.setDate(startDate.getDate() - body.filter_criteria.days)
  startDate.setHours(0) // Set the hour, minute and second components to 0
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let finalCriteria = {}
  let countCriteria = {}
  let recordsToSkip = 0
  findCriteria = {
    title: body.filter_criteria.search_value !== '' ? { $regex: '.*' + body.filter_criteria.search_value + '.*', $options: 'i' } : { $exists: true },
    'datetime': body.filter_criteria.days !== '0' ? {
      $gte: startDate
    } : { $exists: true }
  }
  if (body.first_page === 'first') {
    finalCriteria = [
      { $lookup: { from: 'page_broadcasts', localField: '_id', foreignField: 'broadcastId', as: 'broadcastPages' } },
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
      { $lookup: { from: 'page_broadcasts', localField: '_id', foreignField: 'broadcastId', as: 'broadcastPages' } },
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
      { $lookup: { from: 'page_broadcasts', localField: '_id', foreignField: 'broadcastId', as: 'broadcastPages' } },
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
exports.getAllPollsCriteria = function (body) {
  let findCriteria = {}
  let startDate = new Date() // Current date
  startDate.setDate(startDate.getDate() - body.filter_criteria.days)
  startDate.setHours(0) // Set the hour, minute and second components to 0
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let finalCriteria = {}
  let countCriteria = {}
  let recordsToSkip = 0
  findCriteria = {
    statement: body.filter_criteria.search_value !== '' ? { $regex: '.*' + body.filter_criteria.search_value + '.*', $options: 'i' } : { $exists: true },
    'datetime': body.filter_criteria.days !== '0' ? {
      $gte: startDate
    } : { $exists: true }
  }
  if (body.first_page === 'first') {
    finalCriteria = [
      { $lookup: { from: 'page_polls', localField: '_id', foreignField: 'pollId', as: 'pollPages' } },
      { $match: findCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records },
      { $lookup: { from: 'pollresponses', localField: '_id', foreignField: 'pollId', as: 'pollResponses' } }
    ]
  } else if (body.first_page === 'next') {
    recordsToSkip = Math.abs(((body.requested_page - 1) - (body.current_page))) * body.number_of_records
    let finalFindCriteria = {}
    Object.assign(finalFindCriteria, findCriteria)
    finalFindCriteria._id = { $lt: body.last_id }
    finalCriteria = [
      { $lookup: { from: 'page_polls', localField: '_id', foreignField: 'pollId', as: 'pollPages' } },
      { $match: finalFindCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records },
      { $lookup: { from: 'pollresponses', localField: '_id', foreignField: 'pollId', as: 'pollResponses' } }
    ]
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs(body.requested_page * body.number_of_records)
    let finalFindCriteria = {}
    Object.assign(finalFindCriteria, findCriteria)
    finalFindCriteria._id = { $gt: body.last_id }
    finalCriteria = [
      { $lookup: { from: 'page_polls', localField: '_id', foreignField: 'pollId', as: 'pollPages' } },
      { $match: finalFindCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records },
      { $lookup: { from: 'pollresponses', localField: '_id', foreignField: 'pollId', as: 'pollResponses' } }
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
exports.getAllSurveysCriteria = function (body) {
  let findCriteria = {}
  let startDate = new Date() // Current date
  startDate.setDate(startDate.getDate() - body.filter_criteria.days)
  startDate.setHours(0) // Set the hour, minute and second components to 0
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let finalCriteria = {}
  let countCriteria = {}
  let recordsToSkip = 0
  findCriteria = {
    title: body.filter_criteria.search_value !== '' ? { $regex: '.*' + body.filter_criteria.search_value + '.*', $options: 'i' } : { $exists: true },
    'datetime': body.filter_criteria.days !== '0' ? {
      $gte: startDate
    } : { $exists: true }
  }
  if (body.first_page === 'first') {
    finalCriteria = [
      { $lookup: { from: 'page_surveys', localField: '_id', foreignField: 'surveyId', as: 'surveyPages' } },
      { $match: findCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records },
      { $lookup: { from: 'surveyresponses', localField: '_id', foreignField: 'surveyId', as: 'surveyResponses' } }
    ]
  } else if (body.first_page === 'next') {
    recordsToSkip = Math.abs(((body.requested_page - 1) - (body.current_page))) * body.number_of_records
    let finalFindCriteria = {}
    Object.assign(finalFindCriteria, findCriteria)
    finalFindCriteria._id = { $lt: body.last_id }
    finalCriteria = [
      { $lookup: { from: 'page_surveys', localField: '_id', foreignField: 'surveyId', as: 'surveyPages' } },
      { $match: finalFindCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records },
      { $lookup: { from: 'surveyresponses', localField: '_id', foreignField: 'surveyId', as: 'surveyResponses' } }
    ]
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs(body.requested_page * body.number_of_records)
    let finalFindCriteria = {}
    Object.assign(finalFindCriteria, findCriteria)
    finalFindCriteria._id = { $gt: body.last_id }
    finalCriteria = [
      { $lookup: { from: 'page_surveys', localField: '_id', foreignField: 'surveyId', as: 'surveyPages' } },
      { $match: finalFindCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records },
      { $lookup: { from: 'surveyresponses', localField: '_id', foreignField: 'surveyId', as: 'surveyResponses' } }
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
exports.allUserPollsCriteria = function (userid, body, survey) {
  let findCriteria = {}
  let startDate = new Date() // Current date
  startDate.setDate(startDate.getDate() - body.filter_criteria.days)
  startDate.setHours(0) // Set the hour, minute and second components to 0
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let finalCriteria = {}
  let countCriteria = {}
  let recordsToSkip = 0
  findCriteria = {
    userId: userid,
    'datetime': body.filter_criteria.days !== '0' ? {
      $gte: startDate
    } : { $exists: true }
  }
  if (survey) {
    findCriteria.title = body.filter_criteria.search_value !== '' ? { $regex: '.*' + body.filter_criteria.search_value + '.*', $options: 'i' } : { $exists: true }
  } else {
    findCriteria.statement = body.filter_criteria.search_value !== '' ? { $regex: '.*' + body.filter_criteria.search_value + '.*', $options: 'i' } : { $exists: true }
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
exports.getAllSubscribersCriteria = function (pageid, body) {
  let search = '.*' + body.filter_criteria.search_value + '.*'
  let findCriteria = {
    pageId: pageid,
    fullName: {$regex: search, $options: 'i'},
    isSubscribed: true,
    completeInfo: true,
    gender: body.filter_criteria.gender_value !== '' ? body.filter_criteria.gender_value : {$exists: true},
    locale: body.filter_criteria.locale_value !== '' ? body.filter_criteria.locale_value : {$exists: true}
  }
  let finalCriteria = {}
  let recordsToSkip = 0

  let countCriteria = [
    { $project: {
      'fullName': { '$concat': [ '$firstName', ' ', '$lastName' ] },
      'firstName': 1,
      'lastName': 1,
      'profilePic': 1,
      'companyId': 1,
      'gender': 1,
      'locale': 1,
      'isSubscribed': 1,
      'pageId': 1,
      'completeInfo': 1,
      'datetime': 1,
      'timezone': 1,
      'senderId': 1,
      '_id': 1,
      'tags_subscriber': 1
    }},
    { $match: findCriteria },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]
  // findCriteria is for the count
  // here temp is the findcriteria for Payload
  if (body.first_page === 'first') {
    if (body.current_page) {
      recordsToSkip = Math.abs(body.current_page * body.number_of_records)
    }
    finalCriteria = [
      { $project: {
        'fullName': { '$concat': [ '$firstName', ' ', '$lastName' ] },
        'firstName': 1,
        'lastName': 1,
        'profilePic': 1,
        'companyId': 1,
        'gender': 1,
        'locale': 1,
        'isSubscribed': 1,
        'pageId': 1,
        'completeInfo': 1,
        'datetime': 1,
        'timezone': 1,
        'senderId': 1,
        '_id': 1,
        'tags_subscriber': 1
      }},
      { $match: findCriteria },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'next') {
    recordsToSkip = Math.abs(((body.requested_page - 1) - (body.current_page))) * body.number_of_records
    finalCriteria = [
      { $sort: { datetime: -1 } },
      { $project: {
        'fullName': { '$concat': [ '$firstName', ' ', '$lastName' ] },
        'firstName': 1,
        'lastName': 1,
        'profilePic': 1,
        'companyId': 1,
        'gender': 1,
        'locale': 1,
        'isSubscribed': 1,
        'pageId': 1,
        'completeInfo': 1,
        'datetime': 1,
        'timezone': 1,
        'senderId': 1,
        '_id': 1,
        'tags_subscriber': 1
      }},
      { $match: { $and: [findCriteria, { _id: { $lt: body.last_id } }] } },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs(body.requested_page * body.number_of_records)
    finalCriteria = [
      { $sort: { datetime: -1 } },
      { $project: {
        'fullName': { '$concat': [ '$firstName', ' ', '$lastName' ] },
        'firstName': 1,
        'lastName': 1,
        'profilePic': 1,
        'companyId': 1,
        'gender': 1,
        'locale': 1,
        'isSubscribed': 1,
        'completeInfo': 1,
        'pageId': 1,
        'datetime': 1,
        'timezone': 1,
        'senderId': 1,
        '_id': 1,
        'tags_subscriber': 1
      }},
      { $match: { $and: [findCriteria, { _id: { $gt: body.last_id } }] } },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  }
  return { countCriteria: countCriteria, finalCriteria: finalCriteria }
}
exports.getCriteriasForAutopostingByType = function (req) {
  let matchAggregate = {
    'datetime': req.body.days === 'all' ? { $exists: true } : {
      $gte: new Date(
        (new Date().getTime() - (req.body.days * 24 * 60 * 60 * 1000))),
      $lt: new Date(
        (new Date().getTime()))
    }
  }

  return matchAggregate
}
exports.getFbPostsCriteria = function (req) {
  let criteria = {
    purpose: 'aggregate',
    match: {
      'datetime': req.body.days === 'all' ? { $exists: true } : {
        $gte: new Date(
          (new Date().getTime() - (req.body.days * 24 * 60 * 60 * 1000))),
        $lt: new Date(
          (new Date().getTime()))
      }
    },
    group: {_id: null, count: {$sum: 1}, likes: {$sum: '$likes'}, comments: {$sum: '$comments'}}
  }
  return criteria
}
exports.getCriteriasForAutopostingByTypethatCame = function (req, type) {
  let matchAggregate = {
    'datetime': req.body.days === 'all' ? { $exists: true } : {
      $gte: new Date(
        (new Date().getTime() - (req.body.days * 24 * 60 * 60 * 1000))),
      $lt: new Date(
        (new Date().getTime()))
    },
    autoposting_type: type
  }
  return matchAggregate
}
exports.getPageUsersCriteria = function (body) {
  let searchValue = {$regex: '.*' + body.search_value + '.*', $options: 'i'}
  let filters = { 'user.name': searchValue }
  if (body.type_filter !== '') {
    let typeArray = []
    if (body.type_filter === 'individual') {
      typeArray = [ { 'plan.unique_ID': 'plan_A' }, { 'plan.unique_ID': 'plan_B' } ]
    } else if (body.type_filter === 'team') {
      typeArray = [{ 'plan.unique_ID': 'plan_C' }, { 'plan.unique_ID': 'plan_D' }]
    }
    filters['$or'] = typeArray
  } else {
    filters['plan.unique_ID'] = { $exists: true }
  }
  let findCriteria = {
    pageId: body.pageId,
    connected: body.connected_filter !== '' ? body.connected_filter : {$exists: true}
  }
  let finalCriteria = {}
  let countCriteria = [
    { $match: findCriteria },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { '$unwind': '$user' },
    { $lookup: { from: 'companyprofiles', localField: 'companyId', foreignField: '_id', as: 'company' } },
    { '$unwind': '$company' },
    { $lookup: { from: 'plans', localField: 'company.planId', foreignField: '_id', as: 'plan' } },
    { '$unwind': '$plan' },
    { '$project': { 'user': 1, 'connected': 1, 'company': 1, 'plan': 1, pageName: 1 } },
    { $match: filters },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]
  finalCriteria = [
    { $match: findCriteria },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { '$unwind': '$user' },
    { $lookup: { from: 'companyprofiles', localField: 'companyId', foreignField: '_id', as: 'company' } },
    { '$unwind': '$company' },
    { $lookup: { from: 'plans', localField: 'company.planId', foreignField: '_id', as: 'plan' } },
    { '$unwind': '$plan' },
    { '$lookup': { from: 'subscribers', localField: '_id', foreignField: 'pageId', as: 'subscribers' } },
    { '$project': { 'user': 1, 'connected': 1, 'company': 1, 'plan': 1, pageName: 1, subscribers: 1 } },
    { $match: filters }
  ]
  return {
    countCriteria,
    finalCriteria
  }
}
exports.topPagesCriteria = function (body) {
  let criteria = [
    {$match: {completeInfo: true}},
    {$group: {
      _id: '$pageId',
      count: {$sum: 1}}
    },
    { $sort: { count: -1 } },
    { $limit: body.limit },
    { $lookup: { from: 'pages', localField: '_id', foreignField: '_id', as: 'page' } },
    {'$unwind': '$page'},
    {$match: {'page.connected': true}},
    { $lookup: { from: 'users', localField: 'page.userId', foreignField: '_id', as: 'user' } },
    {'$unwind': '$user'}
  ]
  return criteria
}
exports.getPlatformCriteriaForSubscribers = function (body) {
  let findCriteria = {
    isSubscribed: true,
    completeInfo: true
  }
  if (body.days && body.days !== '') {
    let startDate = new Date() // Current date
    startDate.setDate(startDate.getDate() - body.days)
    startDate.setHours(0) // Set the hour, minute and second components to 0
    startDate.setMinutes(0)
    startDate.setSeconds(0)
    findCriteria.datetime = {$gte: startDate}
  }
  let countCriteria = [
    { $match: findCriteria },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]
  return countCriteria
}

exports.getSubscribersCountForUser = function (body, pages) {
  let findCriteria = {
    isSubscribed: true,
    completeInfo: true,
    pageId: {$in: pages}
  }
  if (body.days && body.days !== '') {
    let startDate = new Date() // Current date
    startDate.setDate(startDate.getDate() - body.days)
    startDate.setHours(0) // Set the hour, minute and second components to 0
    startDate.setMinutes(0)
    startDate.setSeconds(0)
    findCriteria.datetime = {$gte: startDate}
  }
  let countCriteria = [
    { $match: findCriteria },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]
  return countCriteria
}

exports.getPlatformCriteriaForPages = function (type) {
  let countCriteria = [
    { $match: {connected: type ? true : {$exists: true}} },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]
  return countCriteria
}
exports.getPlatformCriteriaForMessages = function (body) {
  let findCriteria = {
    format: 'convos'
  }
  if (body.days && body.days !== '') {
    let startDate = new Date() // Current date
    startDate.setDate(startDate.getDate() - body.days)
    startDate.setHours(0) // Set the hour, minute and second components to 0
    startDate.setMinutes(0)
    startDate.setSeconds(0)
    findCriteria.datetime = {$gte: startDate}
  }
  return {
    purpose: 'aggregate',
    match: findCriteria,
    group: { _id: null, count: { $sum: 1 } }
  }
}
exports.getMessagesCountForUser = function (companyUser, body, isFacebookInboxMessages, format) {
  let findCriteria = {
    format: format,
    company_id: companyUser.companyId && companyUser.companyId !== '' ? companyUser.companyId : {$exists: true},
    replied_by: isFacebookInboxMessages ? {$exists: false} : {$exists: true} 
  }
  if (body.days && body.days !== '') {
    let startDate = new Date() // Current date
    startDate.setDate(startDate.getDate() - body.days)
    startDate.setHours(0) // Set the hour, minute and second components to 0
    startDate.setMinutes(0)
    startDate.setSeconds(0)
    findCriteria.datetime = {$gte: startDate}
  }
  return {
    purpose: 'aggregate',
    match: findCriteria,
    group: { _id: null, count: { $sum: 1 } }
  }
}
exports.getAllCommentCapturesCriteria = function (body) {
  let findCriteria = {
    userId: body.userId && body.userId !== '' ? body.userId : {$exists: true},
    companyId: body.companyId && body.companyId !== '' ? body.companyId : {$exists: true}
  }
  let startDate = new Date() // Current date
  startDate.setDate(startDate.getDate() - body.days)
  startDate.setHours(0) // Set the hour, minute and second components to 0
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let finalCriteria = {}
  let countCriteria = {}
  let recordsToSkip = 0
  if (body.days !== '') {
    let startDate = new Date() // Current date
    startDate.setDate(startDate.getDate() - body.days)
    startDate.setHours(0) // Set the hour, minute and second components to 0
    startDate.setMinutes(0)
    startDate.setSeconds(0)
    findCriteria.datetime = {$gte: startDate}
  }
  if (body.first_page === 'first') {
    finalCriteria = [
      { $match: findCriteria },
      { $lookup: { from: 'pages', localField: 'pageId', foreignField: '_id', as: 'page' } },
      { '$unwind': '$page' },
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
      { $lookup: { from: 'pages', localField: 'pageId', foreignField: '_id', as: 'page' } },
      { '$unwind': '$page' },
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
      { $lookup: { from: 'pages', localField: 'pageId', foreignField: '_id', as: 'page' } },
      { '$unwind': '$page' },
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

exports.getAllChatBotsCriteria = function (body) {
  let findCriteria = {
    userId: body.userId && body.userId !== '' ? body.userId : {$exists: true},
    companyId: body.companyId && body.companyId !== '' ? body.companyId : {$exists: true}
  }
  let startDate = new Date() // Current date
  startDate.setDate(startDate.getDate() - body.days)
  startDate.setHours(0) // Set the hour, minute and second components to 0
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let finalCriteria = {}
  let countCriteria = {}
  let recordsToSkip = 0
  if (body.days !== '') {
    let startDate = new Date() // Current date
    startDate.setDate(startDate.getDate() - body.days)
    startDate.setHours(0) // Set the hour, minute and second components to 0
    startDate.setMinutes(0)
    startDate.setSeconds(0)
    findCriteria.datetime = {$gte: startDate}
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
  countCriteria = {
    purpose: 'aggregate',
    match: findCriteria,
    group: { _id: null, count: { $sum: 1 } }
  }
  let getCriteria = {
    purpose: 'aggregate',
    match: finalCriteria[0].$match,
    sort: finalCriteria[1].$sort,
    skip: finalCriteria[2].$skip,
    limit: finalCriteria[3].$limit
  }
  return {
    countCriteria,
    getCriteria
  }
}
exports.queryForMessages = function (body, format, type) {
  let startDate = new Date(body.startDate)
  startDate.setHours(0)
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let endDate = new Date(body.endDate)
  endDate.setDate(endDate.getDate() + 1)
  endDate.setHours(0)
  endDate.setMinutes(0)
  endDate.setSeconds(0)
  let match = {
    datetime: body.startDate !== '' ? {$gte: startDate, $lt: endDate} : { $exists: true },
    format: format
  }
  if (body.companyId) {
    match.companyId = body.companyId
  }
  if (type) {
    match['payload.templateName'] = type === 'template' ? {$exists: true} : {$exists: false}
  }
  let group = {
    _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
    count: {$sum: 1},
    uniqueValues: {$addToSet: '$contactId'}
  }
  return {
    purpose: 'aggregate',
    match,
    group
  }
}
exports.queryForZoomMeetings = function (body) {
  let startDate = new Date(body.startDate)
  startDate.setHours(0)
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let endDate = new Date(body.endDate)
  endDate.setDate(endDate.getDate() + 1)
  endDate.setHours(0)
  endDate.setMinutes(0)
  endDate.setSeconds(0)
  let match = {
    platform: 'whatsApp',
    datetime: body.startDate !== '' ? {$gte: startDate, $lt: endDate} : { $exists: true }
  }
  if (body.companyId) {
    match.companyId = body.companyId
  }
  let group = {
    _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
    count: {$sum: 1}
  }
  return {
    purpose: 'aggregate',
    match,
    group
  }
}

exports.queryForActiveSubscribers = function (body) {
  let startDate = new Date(body.startDate)
  startDate.setHours(0)
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let endDate = new Date(body.endDate)
  endDate.setDate(endDate.getDate() + 1)
  endDate.setHours(0)
  endDate.setMinutes(0)
  endDate.setSeconds(0)
  let match = {
    last_activity_time: body.startDate !== '' ? {$gte: startDate, $lt: endDate} : { $exists: true }
  }
  if (body.companyId) {
    match.companyId = body.companyId
  }
  let group = {
    _id: null,
    count: {$sum: 1}
  }
  return [
    {$match: match},
    {$group: group}
  ]
}
exports.queryForCompaniesCount = function (body) {
  let countCriteria = [
    { $match: {whatsApp: {$exists: true, $ne: null}} },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]
  return countCriteria
}

exports.setChartData = function (graphData, startDate, endDate) {
  let activeSubscribers = []
  let messagesSent = []
  let templateMessagesSent = []
  let zoomMeetings = []
  let messagesReceived = []
  let difference = getDays(startDate, endDate)
  if (graphData.activeSubscribers && graphData.activeSubscribers.length > 0) {
    activeSubscribers = includeZeroCounts(graphData.activeSubscribers, difference)
  }
  if (graphData.messagesSent && graphData.messagesSent.length > 0) {
    messagesSent = includeZeroCounts(graphData.messagesSent, difference)
  }
  if (graphData.templateMessagesSent && graphData.templateMessagesSent.length > 0) {
    templateMessagesSent = includeZeroCounts(graphData.templateMessagesSent, difference)
  }
  if (graphData.messagesReceived && graphData.messagesReceived.length > 0) {
    messagesReceived = includeZeroCounts(graphData.messagesReceived, difference)
  }
  if (graphData.zoomMeetings && graphData.zoomMeetings.length > 0) {
    zoomMeetings = includeZeroCounts(graphData.zoomMeetings, difference)
  }
  let dataChart = prepareLineChartData(
    activeSubscribers, messagesSent, templateMessagesSent, messagesReceived, zoomMeetings)
  let labels = dataChart.map(a => a.date)
  let messagesSentArray = dataChart.map(m => m.messagesSent)
  let activeSubscribersArray = dataChart.map(m => m.activeSubscribers)
  let templateMessagesSentArray = dataChart.map(m => m.templateMessagesSent)
  let zoomMeetingsArray = dataChart.map(m => m.zoomMeetings)
  let messagesReceivedArray = dataChart.map(m => m.messagesReceived)
  let graph = {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {label: 'Monthly Active Users', data: activeSubscribersArray, fill: false, borderColor: 'rgba(92, 184, 92, 1)', pointBackgroundColor: 'white', pointBorderColor: 'rgba(52, 191, 163, 1)', borderWidth: 1},
        {label: 'Messages Received', data: messagesReceivedArray, fill: false, borderColor: 'rgba(113, 106, 202, 1)', pointBackgroundColor: 'white', pointBorderColor: 'rgba(113, 106, 202, 1)', borderWidth: 1},
        {label: 'Messages Sent', data: messagesSentArray, fill: false, borderColor: 'rgba(217, 83, 79, 1)', pointBackgroundColor: 'white', pointBorderColor: 'rgba(217, 83, 79, 1)', borderWidth: 1},
        {label: 'Template Messages Sent', data: templateMessagesSentArray, fill: false, borderColor: 'rgb(240, 173, 78, 1)', pointBackgroundColor: 'white', pointBorderColor: 'rgba(240, 173, 78, 1)', borderWidth: 1},
        {label: 'Zoom Meetings Created', data: zoomMeetingsArray, fill: false, borderColor: 'rgba(196, 197, 214, 1)', pointBackgroundColor: 'white', pointBorderColor: 'rgba(196, 197, 214, 1)', borderWidth: 1}
      ]
    }
  }
  return graph
  // return {type:'line',data:{labels:['January','February', 'March','April', 'May'], datasets:[{label:'Dogs', data: [50,60,70,180,190]},{label:'Cats', data:[100,200,300,400,500]}]}}
}

function getDays (startDate, endDate) {
  var date1 = new Date(startDate)
  var date2 = new Date(endDate)
  var difference = date2.getTime() - date1.getTime()
  return (difference / (1000 * 3600 * 24))
}

function includeZeroCounts (data, difference) {
  var dataArray = []
  var days = difference
  var index = 0
  var varDate = moment()
  for (var i = 0; i < days; i++) {
    for (var j = 0; j < data.length; j++) {
      var recordId = data[j]._id
      var date = `${recordId.year}-${recordId.month}-${recordId.day}`
      var loopDate = moment(varDate).format('YYYY-MM-DD')
      if (moment(date).isSame(loopDate, 'day')) {
        var d = {}
        d.date = loopDate
        d.count = data[j].count
        dataArray.push(d)
        varDate = moment(varDate).subtract(1, 'days')
        index = 0
        break
      }
      index++
    }
    if (index === data.length) {
      var obj = {}
      obj.date = varDate.format('YYYY-MM-DD')
      obj.count = 0
      dataArray.push(obj)
      varDate = moment(varDate).subtract(1, 'days')
      index = 0
    }
  }
  return dataArray.reverse()
}
function prepareLineChartData (activeSubscribers, messagesSent, templateMessagesSent, messagesReceived, zoomMeetings) {
  var dataChart = []
  if (activeSubscribers && activeSubscribers.length > 0) {
    for (var i = 0; i < activeSubscribers.length; i++) {
      var record = {}
      record.date = activeSubscribers[i].date
      if (messagesSent && messagesSent.length > 0) {
        record.messagesSent = messagesSent[i].count
      } else {
        record.messagesSent = 0
      }
      if (templateMessagesSent && templateMessagesSent.length > 0) {
        record.templateMessagesSent = templateMessagesSent[i].count
      } else {
        record.templateMessagesSent = 0
      }
      if (messagesReceived && messagesReceived.length > 0) {
        record.messagesReceived = messagesReceived[i].count
      } else {
        record.messagesReceived = 0
      }
      if (zoomMeetings && zoomMeetings.length > 0) {
        record.zoomMeetings = zoomMeetings[i].count
      } else {
        record.zoomMeetings = 0
      }
      record.activeSubscribers = activeSubscribers[i].count
      dataChart.push(record)
    }
  } else if (messagesSent && messagesSent.length > 0) {
    for (var j = 0; j < messagesSent.length; j++) {
      var record1 = {}
      record1.date = messagesSent[j].date
      if (activeSubscribers && activeSubscribers.length > 0) {
        record1.activeSubscribers = activeSubscribers[j].count
      } else {
        record1.activeSubscribers = 0
      }
      if (templateMessagesSent && templateMessagesSent.length > 0) {
        record1.templateMessagesSent = templateMessagesSent[j].count
      } else {
        record1.templateMessagesSent = 0
      }
      if (messagesReceived && messagesReceived.length > 0) {
        record1.messagesReceived = messagesReceived[j].count
      } else {
        record1.messagesReceived = 0
      }
      if (zoomMeetings && zoomMeetings.length > 0) {
        record1.zoomMeetings = zoomMeetings[j].count
      } else {
        record1.zoomMeetings = 0
      }
      record1.messagesSent = messagesSent[j].count
      dataChart.push(record1)
    }
  } else if (templateMessagesSent && templateMessagesSent.length > 0) {
    for (var k = 0; k < templateMessagesSent.length; k++) {
      var record2 = {}
      record2.date = templateMessagesSent[k].date
      if (activeSubscribers && activeSubscribers.length > 0) {
        record2.activeSubscribers = activeSubscribers[k].count
      } else {
        record2.activeSubscribers = 0
      }
      if (messagesSent && messagesSent.length > 0) {
        record2.messagesSent = messagesSent[k].count
      } else {
        record2.messagesSent = 0
      }
      if (messagesReceived && messagesReceived.length > 0) {
        record2.messagesReceived = messagesReceived[k].count
      } else {
        record2.messagesReceived = 0
      }
      if (zoomMeetings && zoomMeetings.length > 0) {
        record2.zoomMeetings = zoomMeetings[k].count
      } else {
        record2.zoomMeetings = 0
      }
      record2.templateMessagesSent = templateMessagesSent[k].count
      dataChart.push(record2)
    }
  } else if (messagesReceived && messagesReceived.length > 0) {
    for (var l = 0; l < messagesReceived.length; l++) {
      var record3 = {}
      record3.date = messagesReceived[l].date
      if (activeSubscribers && activeSubscribers.length > 0) {
        record3.activeSubscribers = activeSubscribers[l].count
      } else {
        record3.activeSubscribers = 0
      }
      if (messagesSent && messagesSent.length > 0) {
        record3.messagesSent = messagesSent[l].count
      } else {
        record3.messagesSent = 0
      }
      if (templateMessagesSent && templateMessagesSent.length > 0) {
        record3.templateMessagesSent = templateMessagesSent[l].count
      } else {
        record3.templateMessagesSent = 0
      }
      if (zoomMeetings && templateMessagesSent.length > 0) {
        record3.zoomMeetings = zoomMeetings[l].count
      } else {
        record3.zoomMeetings = 0
      }
      record3.messagesReceived = messagesReceived[l].count
      dataChart.push(record3)
    }
  }
  return dataChart
}
exports.getActingAsUserPayload = function (body, actingUser) {
  let updated = {}
  if (body.type === 'set') {
    updated = {
      actingAsUser: {domain_email: body.domain_email, name: body.name, actingUserplatform: actingUser.platform}
    }
  } else {
    updated = {
      $unset: {actingAsUser: 1}
    }
  }
  return updated
}
