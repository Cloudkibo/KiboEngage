exports.fetchFeedsCriteria = function (body, companyId) {
    let finalCriteria = {}
    let recordsToSkip = 0
    let findCriteria = {
      companyId: companyId,
      title: body.search_value !== '' ? { $regex: body.search_value, $options: 'i' } : { $exists: true }
    }
    if (body.status_value !== '') {
      findCriteria['isActive'] = body.status_value === 'true' ? true : false
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
  