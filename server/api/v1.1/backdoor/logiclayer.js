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
