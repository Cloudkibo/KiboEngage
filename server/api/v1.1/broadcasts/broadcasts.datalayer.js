/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const { callApi } = require('../utility')

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
  return callApi(`broadcasts/query`, 'post', query, '', 'kiboengage')
}
exports.deleteForBroadcasts = (id) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: id}
  }
  return callApi(`broadcasts`, 'delete', query, '', 'kiboengage')
}
exports.createForBroadcast = (payload) => {
  return callApi(`broadcasts`, 'post', payload, '', 'kiboengage')
}

exports.countBroadcasts = (filter) => {
  let query = {
    purpose: 'aggregate',
    match: filter,
    group: { _id: null, count: { $sum: 1 } }
  }
  console.log('query', query)
  return callApi(`broadcasts/query`, 'post', query, '', 'kiboengage')
}

exports.updateBroadcast = (queryObject, updated) => {
  let query = {
    purpose: 'updateAll',
    match: queryObject,
    updated: updated
  }
  return callApi(`broadcasts`, 'put', query, '', 'kiboengage')
}

exports.findBroadcastsWithSortLimit = (queryObject, sort, limit) => {
  let query = {
    purpose: 'aggregate',
    match: queryObject
  }
  if (sort) query.sort = sort
  if (limit) query.limit = limit

  return callApi(`broadcasts/query`, 'post', query, '', 'kiboengage')
}
