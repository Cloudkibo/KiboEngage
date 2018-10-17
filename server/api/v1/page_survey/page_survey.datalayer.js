const PageSurvey = require('./page_survey.model')

exports.genericUpdate = (query, updated, options) => {
  return PageSurvey.update(query, updated, options)
    .exec()
}

exports.aggregate = (query) => {
  return PageSurvey.aggregate(query)
    .exec()
}