const { callApi } = require('../utility')

exports.countBroadcasts = (filter) => {
  let query = {
    purpose: 'aggregate',
    match: filter,
    group: { _id: null, count: { $sum: 1 } }
  }
  console.log('query in count broadcasts', query)
  return callApi(`broadcasts/kiboDashQuery`, 'post', query, '', 'kiboengage')
}
exports.countPolls = (filter) => {
  let query = {
    purpose: 'aggregate',
    match: filter,
    group: { _id: null, count: { $sum: 1 } }
  }
  console.log('query in countPolls', query)
  return callApi(`polls/kiboDashQuery`, 'post', query, '', 'kiboengage')
}
exports.countSurveys = (filter) => {
  let query = {
    purpose: 'aggregate',
    match: filter,
    group: { _id: null, count: { $sum: 1 } }
  }
  return callApi(`surveys/kiboDashQuery`, 'post', query, '', 'kiboengage')
}
exports.aggregateForBroadcasts = (match, group, lookup, limit, sort, skip) => {
  let query = {
    purpose: 'aggregate',
    match: match
  }
  if (group) query.group = group
  if (lookup) query.lookup = lookup
  if (limit) query.limit = limit
  if (sort) query.sort = sort
  if (skip) query.skip = skip

  console.log('query', JSON.stringify(query))
  return callApi(`broadcasts/kiboDashQuery`, 'post', query, '', 'kiboengage')
}
exports.aggregateForPolls = (match, group, lookup, limit, sort, skip, lookup1) => {
  let query = {
    purpose: 'aggregate',
    match: match
  }
  if (group) query.group = group
  if (lookup) query.lookup = lookup
  if (limit) query.limit = limit
  if (sort) query.sort = sort
  if (skip) query.skip = skip
  if (lookup1) query.lookup1 = lookup1

  return callApi(`polls/kiboDashQuery`, 'post', query, '', 'kiboengage')
}
exports.aggregateForSurveys = (match, group, lookup, limit, sort, skip, lookup1) => {
  let query = {
    purpose: 'aggregate',
    match: match
  }
  if (group) query.group = group
  if (lookup) query.lookup = lookup
  if (limit) query.limit = limit
  if (sort) query.sort = sort
  if (skip) query.skip = skip
  if (lookup1) query.lookup1 = lookup1

  return callApi(`surveys/kiboDashQuery`, 'post', query, '', 'kiboengage')
}
exports.aggregateForSessions = (match, group, lookup, limit, sort, skip) => {
  let query = {
    purpose: 'aggregate',
    match: match
  }
  if (group) query.group = group
  if (lookup) query.lookup = lookup
  if (limit) query.limit = limit
  if (sort) query.sort = sort
  if (skip) query.skip = skip

  console.log('query', JSON.stringify(query))
  return callApi(`broadcasts/kiboDashQuery`, 'post', query, '', 'kiboengage')
}
exports.findOnePoll = (id) => {
  let query = {
    purpose: 'findOne',
    match: {_id: id}
  }
  return callApi(`polls/kiboDashQuery`, 'post', query, '', 'kiboengage')
}
exports.findSurvey = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`surveys/kiboDashQuery`, 'post', query, '', 'kiboengage')
}
