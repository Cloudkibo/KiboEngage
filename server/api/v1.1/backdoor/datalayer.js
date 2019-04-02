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
