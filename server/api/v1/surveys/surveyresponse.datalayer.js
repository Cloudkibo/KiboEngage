const SurveyResponse = require('./surveyresponse.model')

exports.genericUpdateForResponse = (query, updated, options) => {
  return SurveyResponse.update(query, updated, options)
    .exec()
}
exports.genericFind = (query) => {
  return SurveyResponse.find(query).populate('surveyId questionId subscriberId')
    .exec()
}
