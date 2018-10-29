const SurveyQuestions = require('./surveyquestions.model')

exports.genericfindForSurveyQuestions = (query) => {
  return SurveyQuestions.find(query).populate('surveyId')
    .exec()
}

exports.removeSurvey = (survey) => {
  return SurveyQuestions.remove({surveyId: survey._id})
  .exec()
}

exports.findSurveyWithId = (survey) => {
  return SurveyQuestions.find({surveyId: survey._id}).populate('surveyId')
  .exec()
}

exports.saveQuestion = (surveyQuestion) => {
  return surveyQuestion.save()
  .exec()

}

exports.findSurveyQuestionById = (req)  => {
  return SurveyQuestions.find({surveyId: req.params.id})
  .exec()

}

exports.removeQuestion = (surveyquestion) => {
  return surveyquestion.remove()
  .exec()
}

exports.findQuestionSurveyById = (req) => {
  return SurveyQuestions.find({surveyId: req.body._id})
  .populate('surveyId')
  .exec()
}
