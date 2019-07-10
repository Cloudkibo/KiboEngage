/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const { callApi } = require('../utility')

exports.findOnePoll = (id) => {
  let query = {
    purpose: 'findOne',
    match: {_id: id}
  }
  return callApi(`polls/query`, 'post', query, 'kiboengage')
}

exports.genericFindForPolls = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`polls/query`, 'post', query, 'kiboengage')
}
exports.createForPoll = (payload) => {
  return callApi(`polls`, 'post', payload, 'kiboengage')
}

exports.aggregateForPolls = (match, group, lookup, limit, sort, skip) => {
  let query = {
    purpose: 'aggregate',
    match: match
  }
  if (group) query.group = group
  if (lookup) query.lookup = lookup
  if (limit) query.limit = limit
  if (sort) query.sort = sort
  if (skip) query.skip = skip

  return callApi(`polls/query`, 'post', query, 'kiboengage')
}
exports.deleteForPolls = (id) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: id}
  }
  return callApi(`polls`, 'delete', query, 'kiboengage')
}

exports.countPolls = (filter) => {
  let query = {
    purpose: 'aggregate',
    match: filter,
    group: { _id: null, count: { $sum: 1 } }
  }
  return callApi(`polls/query`, 'post', query, 'kiboengage')
}
