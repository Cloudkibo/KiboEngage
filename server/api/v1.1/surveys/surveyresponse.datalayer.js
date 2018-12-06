/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const { callApi } = require('../utility')

exports.genericUpdateForResponse = (queryObject, updated, options) => {
  let query = {
    purpose: 'updateAll',
    match: queryObject,
    updated: updated
  }
  if (options.upsert) query.upsert = options.upsert
  if (options.new) query.new = options.new
  if (options.multi) query.multi = options.multi
  return callApi(`surveys/response`, 'put', query, '', 'kiboengage')
}
exports.genericFind = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`surveys/response/query`, 'post', query, '', 'kiboengage')
}

exports.aggregateForSurveyResponse = (query) => {
  // We will call the db layer with aggregate parameter - currently not used in controller
  return new Promise(() => {})
}

exports.findSurveyResponseById = (surveyId) => {
  let query = {
    purpose: 'findAll',
    match: {surveyId: surveyId}
  }
  return callApi(`surveys/response/query`, 'post', query, '', 'kiboengage')
}

exports.removeAllSurveyResponse = (surveyId) => {
  let query = {
    purpose: 'deleteAll',
    match: {surveyId: surveyId}
  }
  return callApi(`surveys/response`, 'delete', query, '', 'kiboengage')
}

exports.saveResponse = (payload) => {
  return callApi(`surveys/response`, 'post', payload, '', 'kiboengage')
}
