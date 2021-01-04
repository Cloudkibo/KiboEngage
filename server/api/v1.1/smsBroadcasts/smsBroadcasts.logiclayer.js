exports.getCriterias = function (body, companyUser) {
  let findCriteria = {}
  let finalCriteria = {}
  let recordsToSkip = 0
  findCriteria = {
    companyId: companyUser.companyId,
    title: body.title && body.title !== '' ? {$regex: body.title} : {$exists: true}
  }
  if (body.filter_criteria && body.filter_criteria.followup_value && body.filter_criteria.followup_value !== '' && body.filter_criteria.followup_value !== 'all') {
    findCriteria.followUp = body.filter_criteria.followup_value === 'yes'
  }
  let countCriteria = [
    { $match: findCriteria },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]

  if (body.first_page === 'first') {
    if (body.current_page) {
      recordsToSkip = Math.abs(body.current_page * body.number_of_records)
    }
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
  return { countCriteria: countCriteria, fetchCriteria: finalCriteria }
}

exports.prepareQueryToGetContacts = function (body, companyId) {
  let query = {
    companyId: companyId,
    isSubscribed: true
  }
  if (body.listIds && body.listIds.length > 0) {
    query.listIds = {$in: body.listIds}
  }
  if (body.segmentation && body.segmentation.length > 0) {
    for (var i = 0; i < body.segmentation.length; i++) {
      var filter = body.segmentation[i]
      if (filter.criteria === 'is') {
        if (filter.condition === 'number' && filter.text.includes('+')) {
          query[`${filter.condition}`] = {$regex: `^\\${filter.text}$`, $options: 'i'}
        } else {
          query[`${filter.condition}`] = {$regex: `^${filter.text}$`, $options: 'i'}
        }
      } else if (filter.criteria === 'contains') {
        if (filter.condition === 'number' && filter.text.includes('+')) {
          query[`${filter.condition}`] = {$regex: `.*\\${filter.text}.*`, $options: 'i'}
        } else {
          query[`${filter.condition}`] = {$regex: `.*${filter.text}.*`, $options: 'i'}
        }
      } else if (filter.criteria === 'begins') {
        if (filter.condition === 'number' && filter.text.includes('+')) {
          query[`${filter.condition}`] = {$regex: `^\\${filter.text}`, $options: 'i'}
        } else {
          query[`${filter.condition}`] = {$regex: `^${filter.text}`, $options: 'i'}
        }
      }
    }
  }
  let finalCriteria = [
    {$match: query}
  ]
  return finalCriteria
}

exports.getCriteriaForResponses = function (body, broadcastId) {
  let finalCriteria = {
    purpose: 'aggregate'
  }
  let recordsToSkip = 0
  let findCriteria = {broadcastId: broadcastId}
  if (body.operator === 'nin') {
    body.responses.forEach((value, index) => {
      body.responses[index] = `^${value}`
    })
  }
  findCriteria['response.text'] = body.operator === 'in' ? {'$in': body.responses} : {'$nin': body.responses}
  if (body.first_page === 'first') {
    finalCriteria.match = findCriteria
    finalCriteria.sort = { datetime: -1 }
    finalCriteria.skip = recordsToSkip
    finalCriteria.limit = body.number_of_records
  } else if (body.first_page === 'next') {
    recordsToSkip = Math.abs(((body.requested_page - 1) - (body.current_page))) * body.number_of_records
    let finalFindCriteria = {}
    Object.assign(finalFindCriteria, findCriteria)
    finalFindCriteria._id = { $lt: body.last_id }
    finalCriteria.match = finalFindCriteria
    finalCriteria.sort = { datetime: -1 }
    finalCriteria.skip = recordsToSkip
    finalCriteria.limit = body.number_of_records
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs(body.requested_page * body.number_of_records)
    let finalFindCriteria = {}
    Object.assign(finalFindCriteria, findCriteria)
    finalFindCriteria._id = { $gt: body.last_id }
    finalCriteria.match = finalFindCriteria
    finalCriteria.sort = { datetime: -1 }
    finalCriteria.skip = recordsToSkip
    finalCriteria.limit = body.number_of_records
  }
  return finalCriteria
}

exports.getCriteriaForFollowUp = function (body, companyId) {
  let criteria = {
    companyId: companyId,
    broadcastId: body.broadcasts && body.broadcasts.length > 0 ? {'$in': body.broadcasts} : {$exists: true}
  }
  if (body.responses.length > 0) {
    if (body.operator === 'nin') {
      body.responses.forEach((value, index) => {
        body.responses[index] = `^${value}`
      })
    }
    criteria['response.text'] = body.operator === 'in' ? {'$in': body.responses} : {'$nin': body.responses}
  }
  if (body.keywords.length > 0) {
    body.keywords.forEach((value, index) => {
      body.keywords[index] = `.*${value}.*`
    })
    criteria['response.text'] = {'$in': body.keywords}
  }
  let finalCriteria = {
    purpose: 'aggregate',
    match: criteria
  }
  return finalCriteria
}

exports.getCriteriaForUniqueResponses = function (broadcastId, getCounts) {
  let query = {
    purpose: 'aggregate',
    match: {broadcastId: broadcastId},
    group: { _id: {$toLower: '$response.text'} }
  }
  if (getCounts) {
    query.group['count'] = { $sum: 1 }
  }
  return query
}
