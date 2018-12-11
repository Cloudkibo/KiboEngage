const { callApi } = require('../utility')

exports.createQuestionSurveys = (surveyQuestion) => {
  console.log('surveyQuestion', surveyQuestion)
  return callApi(`templates/survey/question`, 'post', surveyQuestion, '', 'kiboengage')
}
