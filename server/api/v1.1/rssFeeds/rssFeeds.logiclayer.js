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
      findCriteria['pageId'] = body.page_value
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
      clicked: {'$first': '$clicked'},
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
