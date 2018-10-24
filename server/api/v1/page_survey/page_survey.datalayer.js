const PageSurvey = require('./page_survey.model')

exports.genericUpdate = (query, updated, options) => {
  return PageSurvey.update(query, updated, options)
    .exec()

exports.genericFind = (query) => {
  return PageSurvey.find(query).populate('companyId userId SurveyId')
    .exec()
}

exports.findSurveyPagesById= (req) => {
  return  SurveyPage.find({surveyId: req.params.id})
  .exec()
}

exports.removeSurvey= (surveypage) => {
  return surveypage.remove()
  .exec()
}

exports.savePage= (surveypage) => {
  return surveypage.save()
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

