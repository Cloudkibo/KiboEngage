const mongoose = require('mongoose')

exports.getCriterias = function (body, companyUser) {
  let search = ''
  let findCriteria = {}
  let startDate = new Date() // Current date
  startDate.setDate(startDate.getDate() - body.filter_criteria.days)
  startDate.setHours(0) // Set the hour, minute and second components to 0
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let finalCriteria = {}
  let countCriteria = {}
  let recordsToSkip = 0
  if (body.filter_criteria.search_value === '' && body.filter_criteria.type_value === '') {
    findCriteria = {
      companyId: companyUser.companyId,
      'datetime': body.filter_criteria.days !== '0' ? {
        $gte: startDate
      } : { $exists: true }
    }
  } else {
    search = new RegExp('.*' + body.filter_criteria.search_value + '.*', 'i')
    if (body.filter_criteria.type_value === 'miscellaneous') {
      findCriteria = {
        companyId: companyUser.companyId,
        'payload.1': { $exists: true },
        title: body.filter_criteria.search_value !== '' ? { $regex: search } : { $exists: true },
        'datetime': body.filter_criteria.days !== '0' ? {
          $gte: startDate
        } : { $exists: true }
      }
    } else {
      findCriteria = {
        companyId: companyUser.companyId,
        $and: [{'payload.0.componentType': body.filter_criteria.type_value !== '' ? body.filter_criteria.type_value : { $exists: true }}, {'payload.1': { $exists: false }}],
        title: body.filter_criteria.search_value !== '' ? { $regex: search } : { $exists: true },
        'datetime': body.filter_criteria.days !== '0' ? {
          $gte: startDate
        } : { $exists: true }
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
    finalCriteria = [
      { $match: { $and: [findCriteria, { _id: { $lt: mongoose.Types.ObjectId(body.last_id) } }] } },
      { $sort: { datetime: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs(((body.requested_page) - (body.current_page - 1))) * body.number_of_records
    finalCriteria = [
      { $match: { $and: [findCriteria, { _id: { $gt: mongoose.Types.ObjectId(body.last_id) } }] } },
      { $sort: { datetime: 1 } },
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
