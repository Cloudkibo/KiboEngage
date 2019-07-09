/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const { callApi } = require('../utility')

exports.genericfindForSurveyQuestions = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`surveys/question/query`, 'post', query, 'kiboengage')
}

exports.removeSurvey = (surveyId) => {
  let query = {
    purpose: 'deleteOne',
    match: {surveyId: surveyId}
  }
  return callApi(`surveys/question`, 'delete', query, 'kiboengage')
}

exports.removeAllSurveyQuestionsQuery = (surveyId) => {
  let query = {
    purpose: 'deleteMany',
    match: {surveyId: surveyId}
  }
  return callApi(`surveys/question`, 'delete', query, 'kiboengage')
}

exports.findSurveyWithId = (surveyId) => {
  let query = {
    purpose: 'findAll',
    match: {surveyId: surveyId}
  }
  return callApi(`surveys/question/query`, 'post', query, 'kiboengage')
}

exports.saveQuestion = (payload) => {
  return callApi(`surveys/question`, 'post', payload, 'kiboengage')
}
