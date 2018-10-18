const PageSurvey = require('./page_survey.model')

exports.genericUpdate = (query, updated, options) => {
  return PageSurvey.update(query, updated, options)
    .exec()
}
exports.createForSurveyPage = (payload) => {
  let obj = new PageSurvey(payload)
  return obj.save()
}

exports.aggregate = (query) => {
  return PageSurvey.aggregate(query)
    .exec()
}
