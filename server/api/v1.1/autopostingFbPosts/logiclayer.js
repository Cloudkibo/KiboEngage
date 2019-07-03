exports.getCountCriteria = function (req) {
  let countCriteria = {
    purpose: 'aggregate',
    match: {
      companyId: req.user.companyId,
      autopostingId: req.params.id
    },
    group: { _id: null, count: { $sum: 1 } }
  }
  return countCriteria
}

exports.getMatchCriteria = function (req) {
  let recordsToSkip = 0
  let match = {
    companyId: req.user.companyId,
    autopostingId: req.params.id
  }
  if (req.body.first_page === 'first') {
    recordsToSkip = 0
  } else if (req.body.first_page === 'next') {
    recordsToSkip = Math.abs(((req.body.requested_page - 1) - (req.body.current_page))) * req.body.number_of_records
    match['_id'] = { $lt: req.body.last_id }
  } else if (req.body.first_page === 'previous') {
    recordsToSkip = Math.abs(req.body.requested_page * req.body.number_of_records)
    match['_id'] = { $lt: req.body.last_id }
  }
  let matchCriteria = {
    purpose: 'aggregate',
    match: match,
    limit: req.body.number_of_records,
    sort: {datetime: -1},
    skip: recordsToSkip
  }
  return matchCriteria
}
