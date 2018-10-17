const PageSurvey = require('./page_survey.model')

exports.genericUpdate = (query, updated, options) => {
  return PageSurvey.update(query, updated, options)
    .exec()
}
exports.genericFind = (query) => {
  return PageSurvey.find(query).populate('companyId userId SurveyId')
    .exec()
}
