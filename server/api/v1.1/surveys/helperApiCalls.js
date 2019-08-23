const surveyDataLayer = require('./surveys.datalayer')
const SurveyPageDataLayer = require('../page_survey/page_survey.datalayer')
const surveyResponseDataLayer = require('./surveyresponse.datalayer')
const surveyQuestionsDataLayer = require('./surveyquestion.datalayer')

exports._getOneSurvey = (data, next) => {
  surveyDataLayer.findOneSurvey(data.surveyId)
    .then(survey => {
      data.survey = survey
      next()
    })
    .catch(err => next(err))
}

exports._getSurveyQuestions = (data, next) => {
  surveyQuestionsDataLayer.findSurveyWithId(data.surveyId)
    .then(questions => {
      data.questions = questions
      next()
    })
    .catch(err => next(err))
}

exports._getSurveyResponses = (data, next) => {
  surveyResponseDataLayer.genericFind({'surveyId': data.surveyId})
    .then(responses => {
      data.responses = responses
      next()
    })
    .catch(err => next(err))
}

exports._deleteSurvey = (data, next) => {
  surveyDataLayer.deleteForSurveys(data.surveyId)
    .then(survey => {
      next()
    })
    .catch(err => next(err))
}

exports._deleteSurveyPages = (data, next) => {
  SurveyPageDataLayer.deleteSurveyPage({surveyId: data.surveyId})
    .then(surveypages => {
      next()
    })
    .catch(err => next(err))
}

exports._deleteSurveyResponses = (data, next) => {
  surveyResponseDataLayer.removeAllSurveyResponse(data.surveyId)
    .then(surveyresponses => {
      next()
    })
    .catch(err => next(err))
}

exports._deleteSurveyQuestions = (data, next) => {
  surveyQuestionsDataLayer.removeAllSurveyQuestionsQuery(data.surveyId)
    .then(success => {
      next()
    })
    .catch(err => next(err))
}
