exports.getCriterias = function (body) {
  let findCriteria = {}
  let finalCriteria = {}
  let search = new RegExp('.*' + body.filter_criteria.search_value + '.*', 'i')
  if (body.filter_criteria.search_value !== '') {
    findCriteria = Object.assign(findCriteria, {name: {$regex: search}})
  }
  if (body.filter_criteria.locale_value !== '') {
    findCriteria = Object.assign(findCriteria, {'facebookInfo.locale': body.filter_criteria.locale_value})
  }
  if (body.filter_criteria.gender_value !== '') {
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
  let search = new RegExp('.*' + body.search_value + '.*', 'i')
  let findCriteria = {
    userId: userid,
    pageName: body.search_value !== '' ? {$regex: search} : {$exists: true}
  }
  let recordsToSkip = 0
  let finalCriteria = {}
  let countCriteria = [
    { $match: findCriteria },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]
  if (body.first_page === 'first') {
    finalCriteria = [
      { $lookup: { from: 'subscribers', localField: '_id', foreignField: 'pageId', as: 'subscribers' } },
      { $match: findCriteria },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'next') {
    recordsToSkip = Math.abs(((body.requested_page - 1) - (body.current_page))) * body.number_of_records
    finalCriteria = [
      { $lookup: { from: 'subscribers', localField: '_id', foreignField: 'pageId', as: 'subscribers' } },
      { $match: {$and: [findCriteria, {_id: {$gt: body.last_id}}]} },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs(((body.requested_page) - (body.current_page - 1))) * body.number_of_records
    finalCriteria = [
      { $lookup: { from: 'subscribers', localField: '_id', foreignField: 'pageId', as: 'subscribers' } },
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
        title: body.filter_criteria.search_value !== '' ? { $regex: body.filter_criteria.search_value } : { $exists: true }
      }
    } else {
      findCriteria = {
        userId: userid,
        $and: [{'payload.0.componentType': body.filter_criteria.type_value !== '' ? body.filter_criteria.type_value : { $exists: true }}, {'payload.1': { $exists: false }}],
        title: body.filter_criteria.search_value !== '' ? { $regex: body.filter_criteria.search_value } : { $exists: true }
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
    title: body.filter_criteria.search_value !== '' ? { $regex: body.filter_criteria.search_value } : { $exists: true },
    'datetime': body.filter_criteria.days !== '0' ? {
      $gte: startDate
    } : { $exists: true }
  }
  console.log('findCriteria', findCriteria)
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
exports.getAllSubscribersCriteria = function (pageid, body) {
  let search = '.*' + body.filter_criteria.search_value + '.*'
  let findCriteria = {
    pageId: pageid,
    fullName: {$regex: search, $options: 'i'},
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
    console.log(`finalCriteria ${JSON.stringify(finalCriteria)}`)
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
