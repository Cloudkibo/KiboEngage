const SurveyQuestions = require('./surveyquestions.model')

exports.genericfindForSurveyQuestions = (query) => {
  return SurveyQuestions.find(query).populate('surveyId')
    .exec()
}
