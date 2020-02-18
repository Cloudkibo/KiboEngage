/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const { callApi } = require('../utility')

exports.genericFindForRssFeedPosts = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`newsPosts/query`, 'post', query, 'kiboengage')
}
exports.aggregateForRssFeedPosts = (match, group, lookup, limit, sort, skip, unwind, project) => {
  let query = {
    purpose: 'aggregate',
    match: match
  }
  if (group) query.group = group
  if (lookup) query.lookup = lookup
  if (limit) query.limit = limit
  if (sort) query.sort = sort
  if (skip) query.skip = skip
  if (unwind) query.unwind = unwind
  if (project) query.project = project

  return callApi(`newsPosts/query`, 'post', query, 'kiboengage')
}
exports.createForRssFeedPosts = (payload) => {
  return callApi(`newsPosts`, 'post', payload, 'kiboengage')
}
exports.deleteForRssFeedPosts = (queryObject) => {
  let query = {
    purpose: 'deleteMany',
    match: queryObject
  }
  return callApi(`newsPosts`, 'delete', query, 'kiboengage')
}

exports.countDocuments = (filter, project) => {
  let query = {
    purpose: 'aggregate',
    match: filter,
    group: { _id: null, count: { $sum: 1 } }
  }
  if (project) query.project = project
  return callApi(`newsPosts/query`, 'post', query, 'kiboengage')
}
exports.genericUpdateRssFeedPosts = (queryObject, updated, options) => {
  let query = {
    purpose: 'updateAll',
    match: queryObject,
    updated: updated
  }
  if (options.upsert) query.upsert = options.upsert
  if (options.new) query.new = options.new
  if (options.multi) query.multi = options.multi
  return callApi(`newsPosts`, 'put', query, 'kiboengage')
}
