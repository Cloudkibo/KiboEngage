const { callApi } = require('../utility')

exports.createQuestionSurveys = (surveyQuestion) => {
  return callApi(`templates/survey/question`, 'post', surveyQuestion, 'kiboengage')
}
