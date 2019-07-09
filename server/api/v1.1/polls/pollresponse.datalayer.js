/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const { callApi } = require('../utility')

exports.genericFindForPollResponse = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`polls/response/query`, 'post', query, 'kiboengage')
}
exports.aggregateForPollResponse = (match, group, lookup, limit, sort, skip) => {
  let query = {
    purpose: 'aggregate',
    match: match
  }
  if (group) query.group = group
  if (lookup) query.lookup = lookup
  if (limit) query.limit = limit
  if (sort) query.sort = sort
  if (skip) query.skip = skip

  return callApi(`polls/response/query`, 'post', query, 'kiboengage')
}
exports.createForPollResponse = (payload) => {
  return callApi(`polls/response`, 'post', payload, 'kiboengage')
}
exports.deleteForPollResponse = (queryObject) => {
  let query = {
    purpose: 'deleteMany',
    match: queryObject
  }
  return callApi(`polls/response`, 'delete', query, 'kiboengage')
}

exports.countDocuments = (filter) => {
  let query = {
    purpose: 'aggregate',
    match: filter,
    group: { _id: null, count: { $sum: 1 } }
  }
  return callApi(`polls/response/query`, 'post', query, 'kiboengage')
}
