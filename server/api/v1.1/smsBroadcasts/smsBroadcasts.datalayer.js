const { callApi } = require('../utility')

exports.createBroadcast = (payload) => {
  return callApi(`smsBroadcasts`, 'post', payload, '', 'kiboengage')
}
exports.countBroadcasts = (filter) => {
  let query = {
    purpose: 'aggregate',
    match: filter,
    group: { _id: null, count: { $sum: 1 } }
  }
  console.log('query', query)
  return callApi(`smsBroadcasts/query`, 'post', query, '', 'kiboengage')
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

  console.log('query in aggregate', JSON.stringify(query))
  return callApi(`smsBroadcasts/query`, 'post', query, '', 'kiboengage')
}
