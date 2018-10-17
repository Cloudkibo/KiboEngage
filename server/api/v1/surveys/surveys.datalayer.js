const SurveyResponse = require('./surveyresponse.model')
const SurveyQuestions = require('./surveyquestions.model')
const Surveys = require('./surveys.model')
exports.genericUpdateForResponse = (query, updated, options) => {
  return SurveyResponse.update(query, updated, options)
    .exec()
}
exports.genericfindForSurveyQuestions = (query) => {
  return SurveyQuestions.find(query).populate('surveyId')
    .exec()
}
exports.genericUpdateForSurvey = (query, updated, options) => {
  return Surveys.update(query, updated, options)
    .exec()
}

exports.genericFindForSurvey = (query) => {
  return Surveys.find(query)
    .exec()
}

exports.aggregateSurvey = (query) => {
  return Surveys.aggregate(query)
    .exec()
}