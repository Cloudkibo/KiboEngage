const SurveyResponse = require('./surveyresponse.model')

exports.genericUpdateForResponse = (query, updated, options) => {
  return SurveyResponse.update(query, updated, options)
    .exec()
}
