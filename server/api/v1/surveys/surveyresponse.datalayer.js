const SurveyResponse = require('./surveyresponse.model')

exports.genericUpdateForResponse = (query, updated, options) => {
  return SurveyResponse.update(query, updated, options)
    .exec()
}
exports.genericFind = (query) => {
  return SurveyResponse.find(query).populate('surveyId questionId subscriberId')
    .exec()
}

exports.aggregateForSurveyResponse = (query) => {
  return SurveyResponse.aggregate(query)
    .exec()
}

exports.findSurveyResponseById = (req) => {
  return SurveyResponse.find({surveyId: req.params.id})
  .exec()
}
exports.removeResponse = (Response) => {
 
  return Response.remove()
  .exec()
}

exports.saveResponse = (Response) => {
 
  return Response.save()
  .exec()
}