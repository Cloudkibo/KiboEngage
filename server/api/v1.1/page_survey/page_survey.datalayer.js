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
  return callApi(`page_survey`, 'put', query, '', 'kiboengage')
}

exports.genericFind = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`page_survey/query`, 'post', query, '', 'kiboengage')
}

exports.findSurveyPagesById = (req) => {
  let query = {
    purpose: 'findAll',
    match: {surveyId: req.params.id}
  }
  return callApi(`page_survey/query`, 'post', query, '', 'kiboengage')
}

exports.removeSurvey = (surveypage) => {
  return surveypage.remove()
}

exports.createForSurveyPage = (payload) => {
  return callApi(`page_survey`, 'post', payload, '', 'kiboengage')
}

exports.aggregate = (query) => {
  // We will call the db layer with aggregate parameter - currently not used in controller
  return new Promise(() => {})
}

exports.deleteSurveyPage = (queryObject) => {
  let query = {
    purpose: 'deleteMany',
    match: queryObject
  }
  return callApi(`page_survey`, 'delete', query, '', 'kiboengage')
}

exports.countDocuments = (filter) => {
  let query = {
    purpose: 'aggregate',
    match: filter,
    group: { _id: null, count: { $sum: 1 } }
  }
  return callApi(`page_survey/query`, 'post', query, '', 'kiboengage')
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

  return callApi(`page_survey/query`, 'post', query, '', 'kiboengage')
}
