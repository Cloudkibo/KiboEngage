/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const { callApi } = require('../utility')

exports.findOneSurvey = (id) => {
  let query = {
    purpose: 'findOne',
    match: {_id: id}
  }
  return callApi(`surveys/query`, 'post', query, 'kiboengage')
}

exports.genericFind = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`surveys/query`, 'post', query, 'kiboengage')
}

exports.genericUpdateForSurvey = (queryObject, updated, options) => {
  let query = {
    purpose: 'updateAll',
    match: queryObject,
    updated: updated
  }
  if (options.upsert) query.upsert = options.upsert
  if (options.new) query.new = options.new
  if (options.multi) query.multi = options.multi
  return callApi(`surveys`, 'put', query, 'kiboengage')
}

exports.genericUpdateOneSurvey = (queryObject, updated, options) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: updated
  }
  if (options.upsert) query.upsert = options.upsert
  if (options.new) query.new = options.new
  if (options.multi) query.multi = options.multi
  return callApi(`surveys`, 'put', query, 'kiboengage')
}

exports.aggregateForSurveys = (match, group, lookup, limit, sort, skip) => {
  let query = {
    purpose: 'aggregate',
    match: match
  }
  if (group) query.group = group
  if (lookup) query.lookup = lookup
  if (limit) query.limit = limit
  if (sort) query.sort = sort
  if (skip) query.skip = skip

  return callApi(`surveys/query`, 'post', query, 'kiboengage')
}

exports.deleteForSurveys = (id) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: id}
  }
  return callApi(`surveys`, 'delete', query, 'kiboengage')
}

exports.genericFindForSurvey = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`surveys/query`, 'post', query, 'kiboengage')
}

exports.countSurveys = (filter) => {
  let query = {
    purpose: 'aggregate',
    match: filter,
    group: { _id: null, count: { $sum: 1 } }
  }
  return callApi(`surveys/query`, 'post', query, 'kiboengage')
}

exports.createSurvey = (payload) => {
  return callApi(`surveys`, 'post', payload, 'kiboengage')
}
