const PageSurvey = require('./page_survey.model')

exports.genericUpdate = (query, updated, options) => {
  return PageSurvey.update(query, updated, options)
    .exec()
}

exports.genericFind = (query) => {
  return PageSurvey.find(query)
    .exec()
}

exports.findSurveyPagesById = (req) => {
  return PageSurvey.find({surveyId: req.params.id})
    .exec()
}

exports.removeSurvey = (surveypage) => {
  return surveypage.remove()
}

exports.savePage= (surveypage) => {
  return surveypage.save()
  
}

exports.createForSurveyPage = (payload) => {
  let obj = new PageSurvey(payload)
  return obj.save()
}

exports.aggregate = (query) => {
  return PageSurvey.aggregate(query)
    .exec()
}
