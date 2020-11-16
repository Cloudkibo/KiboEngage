/* eslint-disable camelcase */
/**
 * Created by sojharo on 27/07/2017.
 */

const logger = require('../../../components/logger')
const surveyQuestionsDataLayer = require('./surveyquestion.datalayer')
const SurveyPageDataLayer = require('../page_survey/page_survey.datalayer')
const TAG = 'api/surveys/surveys.controller.js'
const webhookUtility = require('./../notifications/notifications.utility')
const surveyDataLayer = require('./surveys.datalayer')
const surveyLogicLayer = require('./surveys.logiclayer')
const surveyResponseDataLayer = require('./surveyresponse.datalayer')
const callApi = require('../utility/index')
const async = require('async')
const needle = require('needle')
// const utility = require('./../broadcasts/broadcasts.utility')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const { prepareSubscribersCriteria } = require('../../global/utility')
const { sendUsingBatchAPI } = require('../../global/sendConversation')
const _ = require('lodash')
const { updateCompanyUsage } = require('../../global/billingPricing')

exports.allSurveys = function (req, res) {
  callApi.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      let criterias = surveyLogicLayer.getCriterias(req.body, companyUser)
      surveyDataLayer.countSurveys(criterias.countCriteria[0].$match)
        .then(surveysCount => {
          let aggregateMatch = criterias.fetchCriteria[0].$match
          let aggregateSort = criterias.fetchCriteria[1].$sort
          let aggregateSkip = criterias.fetchCriteria[2].$skip
          let aggregateLimit = criterias.fetchCriteria[3].$limit
          surveyDataLayer.aggregateForSurveys(aggregateMatch, undefined, undefined, aggregateLimit, aggregateSort, aggregateSkip)
            .then(surveys => {
              SurveyPageDataLayer.genericFind({companyId: companyUser.companyId})
                .then(surveypages => {
                  surveyDataLayer.genericFind({})
                    .then(responsesCount => {
                      let payload = {
                        surveys: surveys,
                        surveypages: surveypages,
                        responsesCount: responsesCount,
                        count: surveys.length > 0 && surveysCount.length > 0 ? surveysCount[0].count : ''
                      }
                      sendSuccessResponse(res, 200, payload)
                    })
                    .catch(error => {
                      const message = error || 'Internal Server Error'
                      logger.serverLog(message, `${TAG}: exports.allSurveys`, req.body, {user: req.user}, 'error')
                      sendErrorResponse(res, 500, `Failed to response count ${JSON.stringify(error)}`)
                    })
                })
                .catch(error => {
                  const message = error || 'Internal Server Error'
                  logger.serverLog(message, `${TAG}: exports.allSurveys`, req.body, {user: req.user}, 'error')
                  sendErrorResponse(res, 500, `Failed to survey pages ${JSON.stringify(error)}`)
                })
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.allSurveys`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to survey ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.allSurveys`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to survey count ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.allSurveys`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to company user ${JSON.stringify(error)}`)
    })
}

exports.create = function (req, res) {
  callApi.callApi('featureUsage/planQuery', 'post', {planId: req.user.currentPlan})
    .then(planUsage => {
      planUsage = planUsage[0]
      callApi.callApi('featureUsage/companyQuery', 'post', {companyId: req.user.companyId})
        .then(companyUsage => {
          companyUsage = companyUsage[0]
          // add paid plan check later
          // if (planUsage.surveys !== -1 && companyUsage.surveys >= planUsage.surveys) {
          //   return res.status(500).json({
          //     status: 'failed',
          //     description: `Your survey limit has reached. Please upgrade your plan to premium in order to create more surveys`
          //   })
          // }
          async.parallelLimit([
            function (callback) {
              sendWebhook(req, callback)
            },
            function (callback) {
              createSurvey(req, callback)
            }
          ], 10, function (err, results) {
            if (err) {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `failed to create survey ${err}`)
            }
            let survey = results[1]
            sendSuccessResponse(res, 200, survey)
          })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, error)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, error)
    })
}

exports.edit = function (req, res) {
  /* expected request body{
   survey:{
   title: String, // title of survey
   description: String, // description of survey
   image: String, //image url
   userId: {type: Schema.ObjectId, ref: 'users'},
   },
   questions:[{
   statement: String
   options: Array of String
   },...]
   } */
  surveyDataLayer.findOneSurvey(req.body.survey._id)
    .then(survey => {
      survey.title = req.body.survey.title
      survey.description = req.body.survey.description
      survey.image = req.body.survey.image
      surveyDataLayer.genericUpdateOneSurvey({_id: survey._id}, survey, {new: true})
        .then(success => {
          surveyQuestionsDataLayer.removeSurvey(survey._id)
            .then(success => {
              for (let question in req.body.questions) {
                let options = []
                options = req.body.questions[question].options
                const surveyQuestion = {
                  statement: req.body.questions[question].statement, // question statement
                  options, // array of question options
                  type: 'multichoice', // type can be text/multichoice
                  surveyId: survey._id
                }

                surveyQuestionsDataLayer.saveQuestion(surveyQuestion)
                  .then(success => {
                  })
                  .catch(error => {
                    const message = error || 'Internal Server Error'
                    logger.serverLog(message, `${TAG}: exports.edit`, req.body, {user: req.user}, 'error')
                    sendErrorResponse(res, 500, error)
                  })
              }
              sendSuccessResponse(res, 200, res.body.survey)
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.edit`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, error)
            })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.edit`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, error)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.edit`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, error)
    })
}

// Get a single survey
exports.show = function (req, res) {
  surveyDataLayer.findOneSurvey(req.params.id)
    .then(survey => {
      surveyQuestionsDataLayer.findSurveyWithId(survey._id)
        .then(questions => {
          surveyResponseDataLayer.genericFind({'surveyId': survey._id})
            .then(responses => {
              if (responses.length > 0) {
                populateResponses(responses, req).then(result => {
                  sendSuccessResponse(res, 200, {survey, questions, responses: result})
                })
              } else {
                sendSuccessResponse(res, 200, {survey, questions, responses})
              }
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.show`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, error)
            })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.show`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, error)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.show`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, error)
    })
}

function populateResponses (responses, req) {
  return new Promise(function (resolve, reject) {
    let payload = []
    for (let i = 0; i < responses.length; i++) {
      callApi.callApi(`subscribers/query`, 'post', {_id: responses[i].subscriberId})
        .then(subscribers => {
          payload.push({
            questionId: responses[i].questionId,
            surveyId: responses[i].surveyId,
            _id: responses[i]._id,
            datetime: responses[i].datetime,
            response: responses[i].response,
            subscriberId: subscribers[0]
          })
          if (payload.length === responses.length) {
            resolve(payload)
          }
        })
    }
  })
}

// Get a single survey
exports.showQuestions = function (req, res) {
  surveyDataLayer.findOneSurvey(req.params.id)
    .then(survey => {
      surveyQuestionsDataLayer.findSurveyWithId(survey._id)
        .then(questions => {
          sendSuccessResponse(res, 200, {survey, questions})
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.showQuestions`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, error)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.showQuestions`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, error)
    })
}

// Submit response of survey
exports.submitresponse = function (req, res) {
  // expected body will be

  /*
   body:{
   responses:[{qid:_id of question,response:''}],//array of json responses
   surveyId: _id of survey,
   subscriberId: _id of subscriber,
   }
   */
  for (const resp in req.body.responses) {
    const surveyResponse = {
      response: req.body.responses[resp].response, // response submitted by subscriber
      surveyId: req.body.surveyId,
      questionId: req.body.responses[resp].qid,
      subscriberId: req.body.subscriberId
    }

    surveyResponseDataLayer.saveResponse(surveyResponse)
      .then(success => {
      })

      .catch(error => {
        const message = error || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.submitresponse`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 500, error)
      })
  }

  surveyDataLayer.genericUpdateForSurvey({_id: req.body.surveyId}, {$inc: {isresponded: 1}})
    .then(success => {
      sendSuccessResponse(res, 200, 'Response submitted successfully!')
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.submitresponse`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, error)
    })
}

exports.send = function (req, res) {
  let abort = false
  callApi.callApi('featureUsage/planQuery', 'post', {planId: req.user.currentPlan})
    .then(planUsage => {
      planUsage = planUsage[0]
      callApi.callApi('featureUsage/companyQuery', 'post', {companyId: req.user.companyId})
        .then(companyUsage => {
          companyUsage = companyUsage[0]
          // add paid plan check later
          // if (planUsage.surveys !== -1 && companyUsage.surveys >= planUsage.surveys) {
          //   return res.status(500).json({
          //     status: 'failed',
          //     description: `Your survey limit has reached. Please upgrade your plan to premium in order to create more surveys`
          //   })
          // }
          sendSurvey(req, res, planUsage, companyUsage, abort)
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.send`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, error)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.send`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, error)
    })
}
exports.sendSurveyDirectly = function (req, res) {
  let abort = false
  callApi.callApi('featureUsage/planQuery', 'post', {planId: req.user.currentPlan})
    .then(planUsage => {
      planUsage = planUsage[0]
      callApi.callApi('featureUsage/companyQuery', 'post', {companyId: req.user.companyId})
        .then(companyUsage => {
          companyUsage = companyUsage[0]
          // add paid plan check later
          // if (planUsage.surveys !== -1 && companyUsage.surveys >= planUsage.surveys) {
          //   return res.status(500).json({
          //     status: 'failed',
          //     description: `Your survey limit has reached. Please upgrade your plan to premium in order to create more surveys`
          //   })
          // }
          async.parallelLimit([
            function (callback) {
              createSurvey(req, callback)
            }
          ], 10, function (err, result) {
            if (err) {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.sendSurveyDirectly`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to create survey ${JSON.stringify(err)}`)
            }
            let surveyCreated = result[0]
            req.body._id = surveyCreated._id
            sendSurvey(req, res, planUsage, companyUsage, abort)
          })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.sendSurveyDirectly`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, error)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.sendSurveyDirectly`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, error)
    })
}

exports.deleteSurvey = function (req, res) {
  surveyDataLayer.deleteForSurveys(req.params.id)
    .then(survey => {
      // update company usage
      updateCompanyUsage(req.user.companyId, 'surveys', -1)
      SurveyPageDataLayer.deleteSurveyPage({surveyId: req.params.id})
        .then(surveypages => {
          surveyResponseDataLayer.removeAllSurveyResponse(req.params.id)
            .then(surveyresponses => {
              surveyQuestionsDataLayer.removeAllSurveyQuestionsQuery(req.params.id)
                .then(success => {
                  sendSuccessResponse(res, 200)
                })

                .catch(error => {
                  const message = error || 'Internal Server Error'
                  logger.serverLog(message, `${TAG}: exports.deleteSurvey`, req.body, {user: req.user}, 'error')
                  sendErrorResponse(res, 500, '', `failed to survey responses  ${JSON.stringify(error)}`)
                })
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.deleteSurvey`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, '', `failed to survey remove  ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.deleteSurvey`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, '', `failed to survey remove  ${JSON.stringify(error)}`)
        })
    })
}

const _savePageSurvey = (data) => {
  SurveyPageDataLayer.createForSurveyPage(data)
    .then(savedpagebroadcast => {
      require('../../global/messageStatistics').record('surveys')
    })
    .catch(error => {
      const message = error || 'Failed to create page_survey'
      logger.serverLog(message, `${TAG}: _savePageSurvey`, data, {}, 'error')
    })
}

const sendSurvey = (req, res, planUsage, companyUsage, abort) => {
  let pagesFindCriteria = surveyLogicLayer.pageFindCriteria(req)
  callApi.callApi(`pages/query`, 'post', pagesFindCriteria)
    .then(pages => {
      if (pages.length > 0) {
        const page = pages[0]
        callApi.callApi(`user/query`, 'post', {_id: page.userId})
          .then(connectedUser => {
            connectedUser = connectedUser[0]
            var currentUser
            if (req.user.facebookInfo) {
              currentUser = req.user
            } else {
              currentUser = connectedUser
            }
            surveyQuestionsDataLayer.findSurveyWithId(req.body._id)
              .then(questions => {
                if (questions.length > 0) {
                  surveyDataLayer.findOneSurvey(req.body._id)
                    .then(survey => {
                      const firstQuestion = questions[0]
                      const buttons = []
                      const nextQuestionId = questions.length > 1 ? questions[1]._id : 'nil'
                      for (let x = 0; x < firstQuestion.options.length; x++) {
                        buttons.push({
                          type: 'postback',
                          title: firstQuestion.options[x],
                          payload: JSON.stringify({
                            survey_id: req.body._id,
                            option: firstQuestion.options[x],
                            action: firstQuestion.actions ? firstQuestion.actions[x].action : '',
                            sequenceId: firstQuestion.actions ? firstQuestion.actions[x].sequenceId : '',
                            question_id: firstQuestion._id,
                            next_question_id: nextQuestionId,
                            userToken: currentUser.facebookInfo.fbToken
                          })
                        })
                      }
                      const messageData = {
                        componentType: 'survey',
                        attachment: {
                          type: 'template',
                          payload: {
                            template_type: 'button',
                            text: `${survey.description}\n${firstQuestion.statement}`,
                            buttons
                          }
                        },
                        metadata: 'SENT_FROM_KIBOPUSH'
                      }
                      let pageSurveyData = {
                        pageId: page.pageId,
                        userId: req.user._id,
                        surveyId: req.body._id,
                        seen: false,
                        sent: false,
                        companyId: req.user.companyId
                      }
                      let reportObj = {
                        successful: 0,
                        unsuccessful: 0,
                        errors: []
                      }
                      if (req.body.isList) {
                        callApi.callApi(`lists/query`, 'post', surveyLogicLayer.ListFindCriteria(req.body, req.user))
                          .then(lists => {
                            let subsFindCriteria = prepareSubscribersCriteria(req.body, page, lists, 1, req.body.isApprovedForSMP)
                            sendUsingBatchAPI('survey', [messageData], {criteria: subsFindCriteria}, page, req.user, reportObj, _savePageSurvey, pageSurveyData)
                            sendSuccessResponse(res, 200, '', 'Conversation sent successfully!')
                          })
                          .catch(error => {
                            const message = error || 'Failed to fetch lists'
                            logger.serverLog(message, `${TAG}: sendSurvey`, req.body, {user: req.user}, 'error')
                            sendErrorResponse(res, 500, `Failed to fetch lists see server logs for more info`)
                          })
                      } else {
                        let subsFindCriteria = prepareSubscribersCriteria(req.body, page, undefined, 1, req.body.isApprovedForSMP)
                        callApi.callApi(`tags/query`, 'post', { companyId: req.user.companyId, tag: { $in: req.body.segmentationTags } })
                          .then(tags => {
                            let segmentationTags = tags.map(t => t._id)
                            if (segmentationTags.length > 0 || req.body.segmentationSurvey.length > 0) {
                              let requests = []
                              requests.push(callApi.callApi(`tags_subscriber/query`, 'post', { companyId: req.user.companyId, tagId: { $in: segmentationTags } }))
                              requests.push(surveyResponseDataLayer.genericFind({surveyId: {$in: req.body.segmentationSurvey}}))
                              Promise.all(requests)
                                .then(results => {
                                  console.log('survey segmentation results', results)
                                  let tagSubscribers = null
                                  let surveySubscribers = null
                                  if (segmentationTags.length > 0) {
                                    if (results[0].length > 0) {
                                      tagSubscribers = results[0].map((ts) => ts.subscriberId._id)
                                    } else {
                                      sendErrorResponse(res, 500, '', 'No subscribers match the given criteria')
                                    }
                                  }
                                  if (req.body.segmentationSurvey.length > 0) {
                                    if (results[1].length > 0) {
                                      surveySubscribers = results[1].map((ss) => ss.subscriberId)
                                    } else {
                                      sendErrorResponse(res, 500, '', 'No subscribers match the given criteria')
                                    }
                                  }
                                  if (tagSubscribers && surveySubscribers) {
                                    let subscriberIds = _.intersection(tagSubscribers, surveySubscribers)
                                    if (subscriberIds.length > 0) {
                                      subsFindCriteria['_id'] = {$in: subscriberIds}
                                      sendUsingBatchAPI('survey', [messageData], {criteria: subsFindCriteria}, page, req.user, reportObj, _savePageSurvey, pageSurveyData)
                                      sendSuccessResponse(res, 200, '', 'Conversation sent successfully!')
                                    } else {
                                      sendErrorResponse(res, 500, '', 'No subscribers match the given criteria')
                                    }
                                  } else if (tagSubscribers) {
                                    subsFindCriteria['_id'] = {$in: tagSubscribers}
                                    sendUsingBatchAPI('survey', [messageData], {criteria: subsFindCriteria}, page, req.user, reportObj, _savePageSurvey, pageSurveyData)
                                    sendSuccessResponse(res, 200, '', 'Conversation sent successfully!')
                                  } else if (surveySubscribers) {
                                    subsFindCriteria['_id'] = {$in: surveySubscribers}
                                    sendUsingBatchAPI('survey', [messageData], {criteria: subsFindCriteria}, page, req.user, reportObj, _savePageSurvey, pageSurveyData)
                                    sendSuccessResponse(res, 200, '', 'Conversation sent successfully!')
                                  }
                                })
                                .catch(err => {
                                  const message = err || 'Failed to fetch tag subscribers or survey responses'
                                  logger.serverLog(message, `${TAG}: sendSurvey`, req.body, {user: req.user}, 'error')
                                  sendErrorResponse(res, 500, '', 'Failed to fetch tag subscribers or survey responses')
                                })
                            } else {
                              sendUsingBatchAPI('survey', [messageData], {criteria: subsFindCriteria}, page, req.user, reportObj, _savePageSurvey, pageSurveyData)
                              sendSuccessResponse(res, 200, '', 'Conversation sent successfully!')
                            }
                          })
                          .catch(err => {
                            const message = err || 'Failed to fetch tags'
                            logger.serverLog(message, `${TAG}: sendSurvey`, req.body, {user: req.user}, 'error')
                            sendErrorResponse(res, 500, `Failed to fetch tags`)
                          })
                      }
                    })
                    .catch(err => {
                      const message = err || 'Failed to fetch survey'
                      logger.serverLog(message, `${TAG}: sendSurvey`, req.body, {user: req.user}, 'error')
                      sendErrorResponse(res, 500, '', 'Failed to fetch survey')
                    })
                } else {
                  sendErrorResponse(res, 500, '', 'Survey Questions not found!')
                }
              })
              .catch(err => {
                const message = err || 'Failed to fetch survey questions'
                logger.serverLog(message, `${TAG}: sendSurvey`, req.body, {user: req.user}, 'error')
                sendErrorResponse(res, 500, '', 'Failed to fetch survey questions')
              })
          })
          .catch(err => {
            const message = err || 'Failed to fetch user'
            logger.serverLog(message, `${TAG}: sendSurvey`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 500, '', 'Failed to fetch user')
          })
      } else {
        sendErrorResponse(res, 500, '', 'Page not found!')
      }
    })
    .catch(err => {
      const message = err || 'Failed to fetch page'
      logger.serverLog(message, `${TAG}: sendSurvey`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', 'Failed to fetch page')
    })
}

function createSurvey (req, callback) {
  let surveyPayload = surveyLogicLayer.createSurveyPayload(req)
  surveyDataLayer.createSurvey(surveyPayload)
    .then(survey => {
      // update company usage
      updateCompanyUsage(req.user.companyId, 'surveys', 1)
      for (let question in req.body.questions) {
        const surveyQuestion = {
          statement: req.body.questions[question].statement, // question statement
          options: req.body.questions[question].options.map((o) => o.option), // array of question options
          actions: req.body.questions[question].options,
          type: 'multichoice', // type can be text/multichoice
          surveyId: survey._id
        }
        surveyQuestionsDataLayer.saveQuestion(surveyQuestion)
          .then(success => {
            require('./../../../config/socketio').sendMessageToClient({
              room_id: req.user.companyId,
              body: {
                action: 'survey_created',
                payload: {
                  survey_id: survey._id,
                  user_id: req.user._id,
                  user_name: req.user.name,
                  company_id: req.user.companyId
                }
              }
            })
            callback(null, survey)
          })
          .catch(error => {
            const message = error || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: createSurvey`, req.body, {user: req.user}, 'error')
            callback(error)
          })
      }
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: createSurvey`, req.body, {user: req.user}, 'error')
      callback(error)
    })
}

function sendWebhook (req, callback) {
  let pagesFindCriteria = surveyLogicLayer.pageFindCriteria(req)
  callApi.callApi(`pages/query`, 'post', pagesFindCriteria)
    .then(pages => {
      let page = pages[0]
      callApi.callApi(`webhooks/query`, 'post', {pageId: page.pageId})
        .then(webhook => {
          webhook = webhook[0]
          if (webhook && webhook.isEnabled) {
            needle.get(webhook.webhook_url, (err, r) => {
              if (err) {
                const message = err || 'Internal Server Error'
                logger.serverLog(message, `${TAG}: sendWebhook`, req.body, {user: req.user}, 'error')
                callback(err)
              } else if (r.statusCode === 200) {
                if (webhook && webhook.optIn.SURVEY_CREATED) {
                  var data = {
                    subscription_type: 'SURVEY_CREATED',
                    payload: JSON.stringify({userId: req.user._id, companyId: req.user.companyId, title: req.body.survey.title, description: req.body.survey.description, questions: req.body.questions})
                  }
                  needle.post(webhook.webhook_url, data,
                    (error, response) => {
                      if (error) {
                        callback(error)
                      }
                      callback(null, response)
                    })
                } else {
                  callback(null, 'success')
                }
              } else {
                webhookUtility.saveNotification(webhook)
                callback(null, 'success')
              }
            })
          } else {
            callback(null, 'success')
          }
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: sendWebhook`, req.body, {user: req.user}, 'error')
          callback(error)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: sendWebhook`, req.body, {user: req.user}, 'error')
      callback(error)
    })
}
