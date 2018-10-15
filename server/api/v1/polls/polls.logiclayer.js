const mongoose = require('mongoose')

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
