exports.getCriterias = function (body) {
  let findCriteria = {}
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
  if (body.first_page) {
    finalCriteria = [
      { $match: findCriteria },
      { $sort: { createdAt: -1 } },
      { $limit: body.number_of_records }
    ]
  } else {
    finalCriteria = [
      { $match: {$and: [findCriteria, {_id: {$lt: body.last_id}}]} },
      { $sort: { createdAt: -1 } },
      { $limit: body.number_of_records }
    ]
  }
  return {
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
      { $lookup: { from: 'subscribers', localField: '_id', foreignField: 'pageId', as: 'subscribers' } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'next') {
    recordsToSkip = Math.abs(((body.requested_page - 1) - (body.current_page))) * body.number_of_records
    finalCriteria = [
      { $match: {$and: [findCriteria, {_id: {$gt: body.last_id}}]} },
      { $lookup: { from: 'subscribers', localField: '_id', foreignField: 'pageId', as: 'subscribers' } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs(((body.requested_page) - (body.current_page - 1))) * body.number_of_records
    finalCriteria = [
      { $match: {$and: [findCriteria, {_id: {$lt: body.last_id}}]} },
      { $lookup: { from: 'subscribers', localField: '_id', foreignField: 'pageId', as: 'subscribers' } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  }
  return {
    countCriteria,
    finalCriteria
  }
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
    {$group: {
      _id: '$pageId',
      count: {$sum: 1}}
    },
    { $sort: { count: -1 } },
    { $limit: body.limit },
    { $lookup: { from: 'pages', localField: '_id', foreignField: '_id', as: 'page' } },
    {'$unwind': '$page'},
    { $lookup: { from: 'users', localField: 'page.userId', foreignField: '_id', as: 'user' } },
    {'$unwind': '$user'}
  ]
  return criteria
}
