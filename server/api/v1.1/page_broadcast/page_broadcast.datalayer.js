/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const { callApi } = require('../utility')

exports.genericUpdate = (queryObject, updated, options) => {
  let query = {
    purpose: 'updateAll',
    match: queryObject,
    updated: updated
  }
  if (options.upsert) query.upsert = options.upsert
  if (options.new) query.new = options.new
  if (options.multi) query.multi = options.multi
  return callApi(`page_broadcast`, 'put', query, '', 'kiboengage')
}

exports.aggregate = (query) => {
  // We will call the db layer with aggregate parameter - currently not used in controller
  return new Promise(() => {})
}
exports.genericFind = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`page_broadcast/query`, 'post', query, '', 'kiboengage')
}
exports.createForBroadcastPage = (payload) => {
  return callApi(`page_broadcast`, 'post', payload, '', 'kiboengage')
}

exports.countDocuments = (filter) => {
  let query = {
    purpose: 'aggregate',
    match: filter,
    group: { _id: null, count: { $sum: 1 } }
  }
  console.log('query', query)
  return callApi(`page_broadcast/query`, 'post', query, '', 'kiboengage')
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
  return callApi(`page_broadcast/query`, 'post', query, '', 'kiboengage')
}
