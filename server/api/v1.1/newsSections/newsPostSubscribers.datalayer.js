/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const { callApi } = require('../utility')

exports.genericFind = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`newsPostSubscribers/query`, 'post', query, 'kiboengage')
}
exports.aggregate = (match, group, lookup, limit, sort, skip) => {
  let query = {
    purpose: 'aggregate',
    match: match
  }
  if (group) query.group = group
  if (lookup) query.lookup = lookup
  if (limit) query.limit = limit
  if (sort) query.sort = sort
  if (skip) query.skip = skip

  return callApi(`newsPostSubscribers/query`, 'post', query, 'kiboengage')
}
exports.create = (payload) => {
  return callApi(`newsPostSubscribers`, 'post', payload, 'kiboengage')
}
exports.delete = (queryObject) => {
  let query = {
    purpose: 'deleteMany',
    match: queryObject
  }
  return callApi(`newsPostSubscribers`, 'delete', query, 'kiboengage')
}

exports.countDocuments = (filter) => {
  let query = {
    purpose: 'aggregate',
    match: filter,
    group: { _id: null, count: { $sum: 1 } }
  }
  return callApi(`newsPostSubscribers/query`, 'post', query, 'kiboengage')
}
exports.genericUpdate = (queryObject, updated, options) => {
  let query = {
    purpose: 'updateAll',
    match: queryObject,
    updated: updated
  }
  if (options.upsert) query.upsert = options.upsert
  if (options.new) query.new = options.new
  if (options.multi) query.multi = options.multi
  return callApi(`newsPostSubscribers`, 'put', query, 'kiboengage')
}
