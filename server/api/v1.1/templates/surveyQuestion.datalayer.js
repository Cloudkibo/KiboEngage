const SurveyQuestions = require('./surveyQuestion.model')
exports.createQuestionSurveys = (surveyQuestion) => {

    return surveyQuestion.save()
  }
 