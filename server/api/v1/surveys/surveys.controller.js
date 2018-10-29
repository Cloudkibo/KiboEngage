/* eslint-disable camelcase */
/**
 * Created by sojharo on 27/07/2017.
 */

const logger = require('../../../components/logger')
const Surveys = require('./surveys.model')
const SurveyQuestions = require('./surveyquestions.model')
const surveyQuestionsDataLayer = require('./surveyquestion.datalayer')

const SurveyResponses = require('./surveyresponse.model')
const SurveyPage = require('../page_survey/page_survey.model')
const SurveyPageDataLayer = require('../page_survey/page_survey.datalayer')
const AutomationQueueDataLayer = require('./../automationQueue/automationQueue.datalayer')
const TAG = 'api/surveys/surveys.controller.js'
const mongoose = require('mongoose')
const listsDataLayer = require('../lists/list.datalayer')
const DataLayerwebhooks = require('./../webhooks/webhooks.datalayer')
const webhookUtility = require('./../notifications/notifications.utility')
const surveyDataLayer = require('./surveys.datalayer')
const surveyLogicLayer = require('./surveys.logiclayer')
const surveyResponseDataLayer = require('./surveyresponse.datalayer')
const callApi = require('../utility/index')
let _ = require('lodash')

const needle = require('needle')
const dataLayerPages = require('../pages/pages.datalayer')
const utility = require('./../broadcasts/broadcasts.utility')
const compUtility = require('../../../components/utility')

exports.allSurveys = function (req, res) {
  callApi.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      let criterias = surveyLogicLayer.getCriterias(req.body, companyUser)
      surveyDataLayer.aggregateForSurveys(criterias.countCriteria)
        .then(surveysCount => {
          surveyDataLayer.aggregateForSurveys(criterias.fetchCriteria)
            .then(surveys => {
              SurveyPageDataLayer.genericFind({companyId: companyUser.companyId})
                .then(surveypages => {
                  surveyDataLayer.surveyFind()
                    .then(responsesCount => {
                      res.status(200).json({
                        status: 'success',
                        payload: {surveys: req.body.first_page === 'previous' ? surveys.reverse() : surveys, surveypages: surveypages, responsesCount: responsesCount, count: surveys.length > 0 && surveysCount.length > 0 ? surveysCount[0].count : ''}
                      })
                    })
                    .catch(error => {
                      return res.status(500).json({status: 'failed', payload: `Failed to response count ${JSON.stringify(error)}`})
                    })
                })
                .catch(error => {
                  return res.status(500).json({status: 'failed', payload: `Failed due to survey pages ${JSON.stringify(error)}`})
                })
            })
            .catch(error => {
              return res.status(500).json({status: 'failed', payload: `Failed due to survey ${JSON.stringify(error)}`})
            })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed due to survey count ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed due to company user ${JSON.stringify(error)}`})
    })
}

exports.create = function (req, res) {
  console.log('req.headers', req.body)
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      callApi.callApi('companyprofile/query', 'post', {ownerId: req.user._id})
        .then(companyProfile => {
          callApi.callApi('featureUsage/planQuery', 'post', {planId: companyProfile.planId}, req.headers.authorization)
            .then(planUsage => {
              callApi.callApi('featureUsage/companyQuery', 'post', {companyId: companyUser.companyId}, req.headers.authorization)
                .then(companyUsage => {
                  if (planUsage.survey_templates !== -1 && companyUsage.survey_templates >= planUsage.survey_templates) {
                    return res.status(500).json({
                      status: 'failed',
                      description: `Your templates limit has reached. Please upgrade your plan to premium in order to create more templates`
                    })
                  }
                  let surveyPayload = surveyLogicLayer.createSurveyPayload(req, companyUser)
                  let pagesFindCriteria = surveyLogicLayer.pageFindCriteria(req, companyUser)
                  dataLayerPages.findPages(pagesFindCriteria)
                    .then(pages => {
                      pages.forEach((page) => {
                        DataLayerwebhooks.findOnePage(page)
                          .then(webhook => {
                            if (webhook && webhook.isEnabled) {
                              needle.get(webhook.webhook_url)
                                .then(response => {
                                  if (response.statusCode === 200) {
                                    if (webhook && webhook.optIn.SURVEY_CREATED) {
                                      var data = {
                                        subscription_type: 'SURVEY_CREATED',
                                        payload: JSON.stringify({userId: req.user._id, companyId: companyUser.companyId, title: req.body.survey.title, description: req.body.survey.description, questions: req.body.questions})
                                      }
                                      needle.post(webhook.webhook_url, data)
                                        .then(success => {
                                        })
                                        .catch(error => {
                                          return res.status(500).json({status: 'failed to needle', payload: error})
                                        })
                                    }
                                  } else {
                                    webhookUtility.saveNotification(webhook)
                                  }
                                })
                                .catch(error => {
                                  return res.status(500).json({status: 'failed to webhook', payload: error})
                                })
                            }
                          })
                      })
                        .catch(error => {
                          return res.status(500).json({status: 'failed to page', payload: error})
                        })
                    })
                  const survey = new Surveys(surveyPayload)
                  surveyDataLayer.createSurvey(survey)
                    .then(success => {
                      for (let question in req.body.questions) {
                        let options = []
                        options = req.body.questions[question].options
                        const surveyQuestion = new SurveyQuestions({
                          statement: req.body.questions[question].statement, // question statement
                          options, // array of question options
                          type: 'multichoice', // type can be text/multichoice
                          surveyId: survey._id
                        })
                        surveyQuestionsDataLayer.saveQuestion(surveyQuestion)
                          .then(success => {
                            require('./../../../config/socketio').sendMessageToClient({
                              room_id: companyUser.companyId,
                              body: {
                                action: 'survey_created',
                                payload: {
                                  survey_id: survey._id,
                                  user_id: req.user._id,
                                  user_name: req.user.name,
                                  company_id: companyUser.companyId
                                }
                              }
                            })
                            return res.status(201).json({status: 'success', payload: survey})
                          })
                          .catch(error => {
                            return res.status(500).json({status: 'failed to save question', payload: error})
                          })
                      }
                    })
                    .catch(error => {
                      return res.status(500).json({status: 'failed to create survey', payload: error})
                    })
                })
                .catch(error => {
                  return res.status(500).json({status: 'failed to companuUsage', payload: error})
                })
            })
            .catch(error => {
              return res.status(500).json({status: 'failed to plan usage', payload: error})
            })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed to company profile', payload: error})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed to companyUser', payload: error})
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
  surveyDataLayer.findServeyById(req)
   .then(survey => {
     survey.title = req.body.survey.title
     survey.description = req.body.survey.description
     survey.image = req.body.survey.image
     surveyDataLayer.save(survey)
   .then(success => {
     surveyQuestionsDataLayer.removeSurvey(survey)
    .then(success => {
      for (let question in req.body.questions) {
        let options = []
        options = req.body.questions[question].options
        const surveyQuestion = new SurveyQuestions({
          statement: req.body.questions[question].statement, // question statement
          options, // array of question options
          type: 'multichoice', // type can be text/multichoice
          surveyId: survey._id

        })

        surveyQuestionsDataLayer.saveQuestion(surveyQuestion)
        .then(success => {
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: error})
        })
      }
      return res.status(200)
          .json({status: 'success', payload: req.body.survey})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: error})
    })
   })
   .catch(error => {
     return res.status(500).json({status: 'failed', payload: error})
   })
   })
   .catch(error => {
     return res.status(500).json({status: 'failed', payload: error})
   })
}

// Get a single survey
exports.show = function (req, res) {

  surveyDataLayer.findByIdPopulate(req)
        .then(survey => {
          surveyQuestionsDataLayer.findSurveyWithId()
          .then(questions => {
            surveyResponseDataLayer.genericFind(survey)
            .then(responses => {
              return res.status(200)
              .json({status: 'success', payload: {survey, questions, responses}})
            })
            .catch(error => {
              return res.status(500).json({status: 'failed', payload: error})
            })
          })
          .catch(error => {
            return res.status(500).json({status: 'failed', payload: error})
          })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: error})
        })
}

// Get a single survey
exports.showQuestions = function (req, res) {
  surveyDataLayer.findByIdPopulate(req)
  .then(survey => {
    surveyQuestionsDataLayer.findSurveyWithId(req)
  .then(questions => {
    return res.status(200)
    .json({status: 'success', payload: {survey, questions}})
  })
  .catch(error => {
    return res.status(500).json({status: 'failed', payload: error})
  })
  })
  .catch(error => {
    return res.status(500).json({status: 'failed', payload: error})
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
    const surveyResponse = new SurveyResponses({
      response: req.body.responses[resp].response, // response submitted by subscriber
      surveyId: req.body.surveyId,
      questionId: req.body.responses[resp].qid,
      subscriberId: req.body.subscriberId

    })

    surveyResponseDataLayer.saveResponse(surveyResponse)
    .then(success => {
    })

     .catch(error => {
       return res.status(500).json({status: 'failed', description: error})
})
  }

  surveyDataLayer.genericUpdateForSurvey({_id: mongoose.Types.ObjectId(req.body.surveyId)}, {$inc: {isresponded: 1}})
  .then(success => {
    return res.status(200).json({status: 'success', payload: 'Response submitted successfully'})
  })
  //  Surveys.update({ _id: mongoose.Types.ObjectId(req.body.surveyId) }, { $set: { isresponded: true } })
  .catch(error => {
    return res.status(500).json({status: 'failed', description: error})
})
}
function exists (list, content) {
  for (let i = 0; i < list.length; i++) {
    if (JSON.stringify(list[i]) === JSON.stringify(content)) {
      return true
    }
  }
  return false
}
exports.send = function (req, res) {
  let abort = false
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
  .then(companyUser => {
    if (!companyUser) {
      return res.status(404).json({
        status: 'failed',
        description: 'The user account does not belong to any company. Please contact support'
      })
    }
    callApi.callApi('companyprofile/query', 'post', {ownerId: req.user._id})
    .then(companyProfile => {
      callApi.callApi('featureUsage/planQuery', 'post', {planId: companyProfile.planId})
      .then(planUsage => {
        callApi.callApi('featureUsage/companyQuery', 'post', {companyId: companyUser.companyId})
        .then(companyUsage => {
          if (planUsage.surveys !== -1 && companyUsage.surveys >= planUsage.surveys) {
            return res.status(500).json({
              status: 'failed',
              description: `Your survey limit has reached. Please upgrade your plan to premium in order to send more surveys`
            })
          }

          callApi.callApi(`pages/query`, 'post', {companyId: companyUser.companyId, connected: true})
          .then(userPage => {
            callApi.callApi(`user/query`, 'post', {_id: userPage.userId})
            .then(connectedUser => {
              var currentUser
              if (req.user.facebookInfo) {
                currentUser = req.user
              } else {
                currentUser = connectedUser
              }
              surveyQuestionsDataLayer.findQuestionSurveyById(req)
              .then(questions => {
                surveyDataLayer.findQuestionSurveyById(req)
              .then(survey => {
                if (questions.length > 0) {
                  let first_question = questions[0]
                  // create buttons
                  const buttons = []
                  let next_question_id = 'nil'
                  if (questions.length > 1) {
                    next_question_id = questions[1]._id
                  }

                  for (let x = 0; x < first_question.options.length; x++) {
                    buttons.push({
                      type: 'postback',
                      title: first_question.options[x],
                      payload: JSON.stringify({
                        survey_id: req.body._id,
                        option: first_question.options[x],
                        question_id: first_question._id,
                        next_question_id,
                        userToken: currentUser.facebookInfo.fbToken
                      })
                    })
                  }
                  let pagesFindCriteria = surveyLogicLayer.pageFindCriteria(req, companyUser)
                  callApi.callApi(`pages/query`, 'post', {pagesFindCriteria})
                  .then(pages => {
                    for (let z = 0; z < pages.length && !abort; z++) {
                      if (req.body.isList === true) {
                        let ListFindCriteria = {}
                        ListFindCriteria = _.merge(ListFindCriteria,
                          {
                            _id: {
                              $in: req.body.segmentationList
                            }
                          })
                        listsDataLayer.listFind(ListFindCriteria)
                        .then(lists => {
                          let subsFindCriteria = {pageId: pages[z]._id}
                          let listData = []
                          if (lists.length > 1) {
                            for (let i = 0; i < lists.length; i++) {
                              for (let j = 0; j < lists[i].content.length; j++) {
                                if (exists(listData, lists[i].content[j]) === false) {
                                  listData.push(lists[i].content[j])
                                }
                              }
                            }
                            subsFindCriteria = _.merge(subsFindCriteria, {
                              _id: {
                                $in: listData
                              }
                            })
                          } else {
                            subsFindCriteria = _.merge(subsFindCriteria, {
                              _id: {
                                $in: lists[0].content
                              }
                            })
                          }
                          callApi.callApi(`subscribers/query`, 'post', { subsFindCriteria })
                          .then(subscribers => {
                            needle.get(
                            `https://graph.facebook.com/v2.10/${pages[z].pageId}?fields=access_token&access_token=${currentUser.facebookInfo.fbToken}`)
                            .then(resp => {
                              utility.applyTagFilterIfNecessary(req, subscribers, (taggedSubscribers) => {
                                subscribers = taggedSubscribers
                                utility.applySurveyFilterIfNecessary(req, subscribers, (repliedSubscribers) => {
                                  subscribers = repliedSubscribers
                                  for (let j = 0; j < subscribers.length && !abort; j++) {
                                    callApi.callApi(`featureUsage/updateCompany`, 'post', {companyId: companyUser.companyId},{ $inc: { surveys: 1 } })
                                    .then(updated => {
                                      callApi.callApi('featureUsage/companyQuery', 'post', {companyId: companyUser.companyId})
                                      .then(companyUsage => {
                                        if (planUsage.surveys !== -1 && companyUsage.surveys >= planUsage.surveys) {
                                          abort = true
                                        }
                                        const messageData = {
                                          attachment: {
                                            type: 'template',
                                            payload: {
                                              template_type: 'button',
                                              text: `${survey.description}\nPlease respond to these questions. \n${first_question.statement}`,
                                              buttons
                                            }
                                          }
                                        }
                                        const data = {
                                          messaging_type: 'MESSAGE_TAG',
                                          recipient: {id: subscribers[j].senderId}, // this is the subscriber id
                                          message: messageData,
                                          tag: 'NON_PROMOTIONAL_SUBSCRIPTION'
                                        }

                                          // checks the age of function using callback
                                        compUtility.checkLastMessageAge(subscribers[j].senderId, (err, isLastMessage) => {
                                          if (err) {
                                            logger.serverLog(TAG, 'inside error')
                                            return logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                                          }
                                          if (isLastMessage) {
                                            logger.serverLog(TAG, 'inside suvery send' + JSON.stringify(data))
                                            needle.post(
                                            `https://graph.facebook.com/v2.6/me/messages?access_token=${resp.body.access_token}`,data)
                                            .then(resp => {
                                              let surveyPage = new SurveyPage({
                                                pageId: pages[z].pageId,
                                                userId: req.user._id,
                                                subscriberId: subscribers[j].senderId,
                                                surveyId: req.body._id,
                                                seen: false,
                                                companyId: companyUser.companyId
                                              })

                                              SurveyPageDataLayer.savePage(surveyPage)
                                              .then(success => {
                                                require('./../../../config/socketio').sendMessageToClient({
                                                  room_id: companyUser.companyId,
                                                  body: {
                                                    action: 'survey_send',
                                                    payload: {
                                                      survey_id: survey._id,
                                                      user_id: req.user._id,
                                                      user_name: req.user.name,
                                                      company_id: companyUser.companyId
                                                    }
                                                  }
                                                })
                                              })
                                                .catch(error => {
                                                  return res.status(500).json({status: 'failed', description: error})
                                                })
                                              })
                                              .catch(error => {
                                                return res.status(500).json({status: 'failed', description: error})
                                              })
                                          } else {
                                            logger.serverLog(TAG, 'agent was engaged just 30 minutes ago ')
                                            let timeNow = new Date()
                                            let automatedQueueMessage = {
                                              automatedMessageId: req.body._id,
                                              subscriberId: subscribers[j]._id,
                                              companyId: companyUser.companyId,
                                              type: 'survey',
                                              scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)
                                            }

                                            AutomationQueueDataLayer.createAutomationQueueObject(automatedQueueMessage)
                                            .then(success => {
                                            })
                                            .catch(error => {
                                              return res.status(500).json({status: 'failed', description: error})
                                            })
                                          }
                                        })
                                      })
                                      .catch(error => {
                                        return res.status(500).json({status: 'failed', description: error})
                                      })
                                    })
                                      .catch(error => {
                                        return res.status(500).json({status: 'failed', description: error})
                                      })
                                  }
                                })
                              })
                            })
                            .catch(error => {
                              return res.status(500).json({status: 'failed', description: error})
                            })
                          })
                          .catch(error => {
                            return res.status(500).json({status: 'failed', description: error})
                          })
                        })
                        .catch(error => {
                          return res.status(500).json({status: 'failed', description: error})
                        })
                      } else {
                        let subscriberFindCriteria = {
                          pageId: pages[z]._id,
                          isSubscribed: true
                        }
                        if (req.body.isSegmented) {
                          if (req.body.segmentationGender.length > 0) {
                            subscriberFindCriteria = _.merge(subscriberFindCriteria,
                              {
                                gender: {
                                  $in: req.body.segmentationGender
                                }
                              })
                          }
                          if (req.body.segmentationLocale.length > 0) {
                            subscriberFindCriteria = _.merge(subscriberFindCriteria, {
                              locale: {
                                $in: req.body.segmentationLocale
                              }
                            })
                          }
                        }
                        callApi.callApi(`subscribers/query`, 'post', {subscriberFindCriteria})
                        .then(subscribers => {
                          needle.get(
                          `https://graph.facebook.com/v2.10/${pages[z].pageId}?fields=access_token&access_token=${currentUser.facebookInfo.fbToken}`)
                          .then(resp => {
                            utility.applyTagFilterIfNecessary(req, subscribers, (taggedSubscribers) => {
                              subscribers = taggedSubscribers
                              utility.applySurveyFilterIfNecessary(req, subscribers, (repliedSubscribers) => {
                                subscribers = repliedSubscribers
                                for (let j = 0; j < subscribers.length && !abort; j++) {
                                  callApi.callApi(`featureUsage/updateCompany`, 'post', {companyId: companyUser.companyId},{ $inc: { surveys: 1 } })
                                  .then(updated => {
                                    callApi.callApi(`featureUsage/companyQuery`, 'post', {companyId: companyUser.companyId})
                                      .then(companyUsage => {
                                        if (planUsage.surveys !== -1 && companyUsage.surveys >= planUsage.surveys) {
                                          abort = true
                                        }
                                        const messageData = {
                                          attachment: {
                                            type: 'template',
                                            payload: {
                                              template_type: 'button',
                                              text: `${survey.description}\nPlease respond to these questions. \n${first_question.statement}`,
                                              buttons
                                            }
                                          }
                                        }
                                        const data = {
                                          messaging_type: 'MESSAGE_TAG',
                                          recipient: {id: subscribers[j].senderId}, // this is the subscriber id
                                          message: messageData,
                                          tag: 'NON_PROMOTIONAL_SUBSCRIPTION'
                                        }

                                        // this calls the needle when the last message was older than 30 minutes
                                        // checks the age of function using callback
                                        compUtility.checkLastMessageAge(subscribers[j].senderId, (err, isLastMessage) => {
                                          if (err) {
                                            logger.serverLog(TAG, 'inside error')
                                            return logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                                          }
                                          if (isLastMessage) {
                                            logger.serverLog(TAG, 'inside send survey' + JSON.stringify(data))
                                            needle.post(
                                              `https://graph.facebook.com/v2.6/me/messages?access_token=${resp.body.access_token}`,data)
                                              .then(resp => {
                                                let surveyPage = new SurveyPage({
                                                  pageId: pages[z].pageId,
                                                  userId: req.user._id,
                                                  subscriberId: subscribers[j].senderId,
                                                  surveyId: req.body._id,
                                                  seen: false,
                                                  companyId: companyUser.companyId
                                                })

                                                SurveyPageDataLayer.savePage(surveyPage)
                                                .then(updated => {
                                                  require('./../../../config/socketio').sendMessageToClient({
                                                    room_id: companyUser.companyId,
                                                    body: {
                                                      action: 'survey_send',
                                                      payload: {
                                                        survey_id: survey._id,
                                                        user_id: req.user._id,
                                                        user_name: req.user.name,
                                                        company_id: companyUser.companyId
                                                      }
                                                    }
                                                  })

                                                // not using now
                                                // Sessions.findOne({
                                                //   subscriber_id: subscribers[j]._id,
                                                //   page_id: pages[z]._id,
                                                //   company_id: pages[z].userId._id
                                                // }, (err, session) => {
                                                //   if (err) {
                                                //     return logger.serverLog(TAG,
                                                //       `At get session ${JSON.stringify(err)}`)
                                                //   }
                                                //   if (!session) {
                                                //     return logger.serverLog(TAG,
                                                //       `No chat session was found for surveys`)
                                                //   }
                                                //   const chatMessage = new LiveChat({
                                                //     sender_id: pages[z]._id, // this is the page id: _id of Pageid
                                                //     recipient_id: subscribers[j]._id, // this is the subscriber id: _id of subscriberId
                                                //     sender_fb_id: pages[z].pageId, // this is the (facebook) :page id of pageId
                                                //     recipient_fb_id: subscribers[j].senderId, // this is the (facebook) subscriber id : pageid of subscriber id
                                                //     session_id: session._id,
                                                //     company_id: pages[z].userId._id, // this is admin id till we have companies
                                                //     payload: {
                                                //       componentType: 'survey',
                                                //       payload: messageData
                                                //     }, // this where message content will go
                                                //     status: 'unseen' // seen or unseen
                                                //   })
                                                //   chatMessage.save((err, chatMessageSaved) => {
                                                //     if (err) {
                                                //       return logger.serverLog(TAG,
                                                //         `At save chat${JSON.stringify(err)}`)
                                                //     }
                                                //     logger.serverLog(TAG,
                                                //       'Chat message saved for surveys sent')
                                                //   })
                                                // })
                                                })
                                                .catch(error => {
                                                  return res.status(500).json({status: 'failed', description: error})
                                                })
                                              })
                                              .catch(error => {
                                                return res.status(500).json({status: 'failed', description: error})
                                              })
                                          } else {
                                            logger.serverLog(TAG, 'agent was engaged just 30 minutes ago ')
                                            let timeNow = new Date()
                                            let payload = {
                                              automatedMessageId: req.body._id,
                                              subscriberId: subscribers[j]._id,
                                              companyId: companyUser.companyId,
                                              type: 'survey',
                                              scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)
                                            }

                                            AutomationQueueDataLayer.createAutomationQueueObject(payload)
                                              .then(success => {
                                              })
                                            .catch(error => {
                                              return res.status(500).json({status: 'failed', description: error})
                                            })
                                          }
                                        })
                                      })
                                      .catch(error => {
                                        return res.status(500).json({status: 'failed', description: error})
                                      })
                                  })
                                    .catch(error => {
                                      return res.status(500).json({status: 'failed', description: error})
                                    })
                                }
                              })
                            })
                          })
                          .catch(error => {
                            return res.status(500).json({status: 'failed', description: error})
                          })
                        })
                        .catch(error => {
                          return res.status(500).json({status: 'failed', description: error})
                        })
                      }
                    }
                  })
                .catch(error => {
                  return res.status(500).json({status: 'failed', description: error})
                })
                }

                else {
                  return res.status(404)
                  .json({status: 'failed', description: 'Survey Questions not found'})
                }
              })
              .catch(error => {
                return res.status(500).json({status: 'failed', description: error})
              })
              })
              .catch(error => {
                return res.status(500).json({status: 'failed', description: error})
              })
            })
            .catch(error => {
              return res.status(500).json({status: 'failed', description: error})
            })
          })
          .catch(error => {
            return res.status(500).json({status: 'failed', description: error})
          })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', description: error})
        })
      })
      .catch(error => {
        return res.status(500).json({status: 'failed', description: error})
      })
    })
  .catch(error => {
    return res.status(500).json({status: 'failed', description: error})
  })
  })
.catch(error => {
  return res.status(500).json({status: 'failed', description: error})
})
}
exports.sendSurvey = function (req, res) {
  let abort = false
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
  .then(companyUser => {
    if (!companyUser) {
      return res.status(404).json({
        status: 'failed',
        description: 'The user account does not belong to any company. Please contact support'
      })
    }
    callApi.callApi('companyprofile/query', 'post', {ownerId: req.user._id})
    .then(companyProfile => {
      callApi.callApi('featureUsage/planQuery', 'post', {planId: companyProfile.planId})
      .then(planUsage => {
        callApi.callApi('featureUsage/companyQuery', 'post', {companyId: companyUser.companyId})
        .then(companyUsage => {
          if (planUsage.survey_templates !== -1 && companyUsage.survey_templates >= planUsage.survey_templates) {
            return res.status(500).json({
              status: 'failed',
              description: `Your templates limit has reached. Please upgrade your plan to premium in order to create more templates`
            })
          }
          let surveyPayload = surveyLogicLayer.createSurveyPayload(req, companyUser)
          const survey = new Surveys(surveyPayload)

          surveyDataLayer.createSurvey(survey)
          .then(survey => {
            // after survey is created, create survey questions
            for (let question in req.body.questions) {
              let options = []
              options = req.body.questions[question].options
              const surveyQuestion = new SurveyQuestions({
                statement: req.body.questions[question].statement, // question statement
                options, // array of question options
                type: 'multichoice', // type can be text/multichoice
                surveyId: survey._id
              })

              surveyQuestionsDataLayer.saveQuestion(surveyQuestion)
              .then(success => {
              })
              .catch(error => {
                return res.status(500).json({status: 'failed', description: error})
              })
            }
            require('./../../../config/socketio').sendMessageToClient({
              room_id: companyUser.companyId,
              body: {
                action: 'survey_created',
                payload: {
                  survey_id: survey._id,
                  user_id: req.user._id,
                  user_name: req.user.name,
                  company_id: companyUser.companyId
                }
              }
            })
            callApi.callApi(`pages/query`, 'post', {companyId: companyUser.companyId, connected: true})
            .then(userPage => {
              callApi.callApi(`user/query`, 'post', {_id: userPage.userId})
              .then(connectedUser => {
                var currentUser
                if (req.user.facebookInfo) {
                  currentUser = req.user
                } else {
                  currentUser = connectedUser
                }
                /*
                Expected request body
                { platform: 'facebook',statement: req.body.statement,options: req.body.options,sent: 0 });
                */
                // we will send only first question to fb subsribers
                // find questions
                surveyQuestionsDataLayer.findQuestionSurveyById(req)
                .then(questions => {
                  surveyDataLayer.findQuestionSurveyById(req)
                  .then(survey => {
                    if (questions.length > 0) {
                      let first_question = questions[0]
                      // create buttons
                      const buttons = []
                      let next_question_id = 'nil'
                      if (questions.length > 1) {
                        next_question_id = questions[1]._id
                      }

                      for (let x = 0; x < first_question.options.length; x++) {
                        buttons.push({
                          type: 'postback',
                          title: first_question.options[x],
                          payload: JSON.stringify({
                            survey_id: survey._id,
                            option: first_question.options[x],
                            question_id: first_question._id,
                            next_question_id,
                            userToken: currentUser.facebookInfo.fbToken
                          })
                        })
                      }

                      let pagesFindCriteria = surveyLogicLayer.pageFindCriteria(req, companyUser)
                      callApi.callApi(`pages/query`, 'post', {pagesFindCriteria})
                      .then(pages => {
                        for (let z = 0; z < pages.length && !abort; z++) {
                          DataLayerwebhooks.findOnePage(pages[z])
                          .then(webhook => {
                            if (webhook && webhook.isEnabled) {
                              needle.get(webhook.webhook_url)
                              .then(response => {
                                if (response.statusCode === 200) {
                                  if (webhook && webhook.optIn.SURVEY_CREATED) {
                                    var data = {
                                      subscription_type: 'SURVEY_CREATED',
                                      payload: JSON.stringify({userId: req.user._id, companyId: companyUser.companyId, title: req.body.survey.title, description: req.body.survey.description, questions: req.body.questions})
                                    }
                                    needle.post(webhook.webhook_url, data)
                                    .then(success => {
                                    })
                                    .catch(error => {
                                      return res.status(500).json({status: 'failed', payload: error})
                                    })
                                  }
                                } else {
                                  webhookUtility.saveNotification(webhook)
                                }
                              })
                              .catch(error => {
                                return res.status(500).json({status: 'failed', payload: error})
                              })
                            }
                          })
                          .catch(error => {
                            return res.status(500).json({status: 'failed', payload: error})
                          })
                          if (req.body.isList === true) {
                            let ListFindCriteria = {}
                            ListFindCriteria = _.merge(ListFindCriteria,
                              {
                                _id: {
                                  $in: req.body.segmentationList
                                }
                              })

                            listsDataLayer.listFind(ListFindCriteria)
                            .then(lists => {
                              let subsFindCriteria = {pageId: pages[z]._id}
                              let listData = []
                              if (lists.length > 1) {
                                for (let i = 0; i < lists.length; i++) {
                                  for (let j = 0; j < lists[i].content.length; j++) {
                                    if (exists(listData, lists[i].content[j]) === false) {
                                      listData.push(lists[i].content[j])
                                    }
                                  }
                                }
                                subsFindCriteria = _.merge(subsFindCriteria, {
                                  _id: {
                                    $in: listData
                                  }
                                })
                              } else {
                                subsFindCriteria = _.merge(subsFindCriteria, {
                                  _id: {
                                    $in: lists[0].content
                                  }
                                })
                              }

                              callApi.callApi(`subscribers/query`, 'post', { subsFindCriteria })
                          .then(subscribers => {
                            needle.get(
                              `https://graph.facebook.com/v2.10/${pages[z].pageId}?fields=access_token&access_token=${currentUser.facebookInfo.fbToken}`)
                              .then(resp => {
                                utility.applyTagFilterIfNecessary(req, subscribers, (taggedSubscribers) => {
                                  subscribers = taggedSubscribers
                                  utility.applySurveyFilterIfNecessary(req, subscribers, (repliedSubscribers) => {
                                    subscribers = repliedSubscribers
                                    for (let j = 0; j < subscribers.length && !abort; j++) {
                                      callApi.callApi(`featureUsage/updateCompany`, 'post', {companyId: companyUser.companyId},{ $inc: { surveys: 1 } })
                                      .then(updated => {
                                        callApi.callApi('featureUsage/companyQuery', 'post', {companyId: companyUser.companyId})
                                        .then(companyUsage => {
                                          if (planUsage.surveys !== -1 && companyUsage.surveys >= planUsage.surveys) {
                                            abort = true
                                          }
                                          const messageData = {
                                            attachment: {
                                              type: 'template',
                                              payload: {
                                                template_type: 'button',
                                                text: `${survey.description}\nPlease respond to these questions. \n${first_question.statement}`,
                                                buttons
                                              }
                                            }
                                          }
                                          const data = {
                                            messaging_type: 'MESSAGE_TAG',
                                            recipient: {id: subscribers[j].senderId}, // this is the subscriber id
                                            message: messageData,
                                            tag: req.body.fbMessageTag
                                          }
                                          // this calls the needle when the last message was older than 30 minutes
                                          // checks the age of function using callback
                                          logger.serverLog(TAG, 'just before sending')
                                          compUtility.checkLastMessageAge(subscribers[j].senderId, (err, isLastMessage) => {
                                            if (err) {
                                              logger.serverLog(TAG, 'inside error')
                                              return logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                                            }

                                            if (isLastMessage) {
                                              logger.serverLog(TAG, 'inside direct survey send' + JSON.stringify(data))
                                              needle.post(
                                                    `https://graph.facebook.com/v2.6/me/messages?access_token=${resp.body.access_token}`,data)
                                                    .then(resp => {
                                                      let surveyPage = new SurveyPage({
                                                        pageId: pages[z].pageId,
                                                        userId: req.user._id,
                                                        subscriberId: subscribers[j].senderId,
                                                        surveyId: survey._id,
                                                        seen: false,
                                                        companyId: companyUser.companyId
                                                      })

                                                      SurveyPageDataLayer.savePage(surveyPage)
                                                      .then(success => {

                                                      })
                                                      .catch(error => {
                                                        return res.status(500).json({status: 'failed', description: error})
                                                      })
                                                    })
                                                    .catch(error => {
                                                      return res.status(500).json({status: 'failed', description: error})
                                                    })
                                            } else {
                                              logger.serverLog(TAG, 'agent was engaged just 30 minutes ago ')
                                              let timeNow = new Date()
                                              let automatedQueueMessage = {
                                                automatedMessageId: survey._id,
                                                subscriberId: subscribers[j]._id,
                                                companyId: companyUser.companyId,
                                                type: 'survey',
                                                scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)
                                              }

                                              AutomationQueueDataLayer.createAutomationQueueObject(automatedQueueMessage)
                                              .then(success => {

                                              })
                                              .catch(error => {
                                                return res.status(500).json({status: 'failed', description: error})
                                              })
                                            }
                                          })
                                        })
                                            .catch(error => {
                                              return res.status(500).json({status: 'failed', description: error})
                                            })
                                      })
                                          .catch(error => {
                                            return res.status(500).json({status: 'failed', description: error})
                                          })
                                    }
                                  })
                                })
                              })
                                .catch(error => {
                                  return res.status(500).json({status: 'failed', description: error})
                                })
                          })
                              .catch(error => {
                                return res.status(500).json({status: 'failed', description: error})
                              })
                            })
                          } else {
                            let subscriberFindCriteria = {
                              pageId: pages[z]._id,
                              isSubscribed: true
                            }
                            if (req.body.isSegmented) {
                              if (req.body.segmentationGender.length > 0) {
                                subscriberFindCriteria = _.merge(subscriberFindCriteria,
                                  {
                                    gender: {
                                      $in: req.body.segmentationGender
                                    }
                                  })
                              }
                              if (req.body.segmentationLocale.length > 0) {
                                subscriberFindCriteria = _.merge(subscriberFindCriteria, {
                                  locale: {
                                    $in: req.body.segmentationLocale
                                  }
                                })
                              }
                            }
                            callApi.callApi(`subscribers/query`, 'post', {subscriberFindCriteria})
                            .then(subscribers => {
                              needle.get(
                                `https://graph.facebook.com/v2.10/${pages[z].pageId}?fields=access_token&access_token=${currentUser.facebookInfo.fbToken}`)
                                .then(resp => {
                                  utility.applyTagFilterIfNecessary(req, subscribers, (taggedSubscribers) => {
                                    subscribers = taggedSubscribers
                                    utility.applySurveyFilterIfNecessary(req, subscribers, (repliedSubscribers) => {
                                      subscribers = repliedSubscribers
                                      for (let j = 0; j < subscribers.length && !abort; j++) {
                                        callApi.callApi(`featureUsage/updateCompany`, 'post', {companyId: companyUser.companyId}, { $inc: { surveys: 1 } })
                                        .then(updated => {
                                          callApi.callApi(`featureUsage/companyQuery`, 'post', {companyId: companyUser.companyId})
                                        .then(companyUsage => {
                                          if (planUsage.surveys !== -1 && companyUsage.surveys >= planUsage.surveys) {
                                            abort = true
                                          }
                                          const messageData = {
                                            attachment: {
                                              type: 'template',
                                              payload: {
                                                template_type: 'button',
                                                text: `${survey.description}\nPlease respond to these questions. \n${first_question.statement}`,
                                                buttons
                                              }
                                            }
                                          }
                                          const data = {
                                            messaging_type: 'MESSAGE_TAG',
                                            recipient: {id: subscribers[j].senderId}, // this is the subscriber id
                                            message: messageData,
                                            tag: req.body.fbMessageTag
                                          }
                                          // this calls the needle when the last message was older than 30 minutes
                                          // checks the age of function using callback
                                          logger.serverLog(TAG, 'just before sending')
                                          compUtility.checkLastMessageAge(subscribers[j].senderId, (err, isLastMessage) => {
                                            if (err) {
                                              logger.serverLog(TAG, 'inside error')
                                              return logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                                            }

                                            if (isLastMessage) {
                                              logger.serverLog(TAG, 'inside direct survey sendd' + JSON.stringify(data))
                                              needle.post(
                                                `https://graph.facebook.com/v2.6/me/messages?access_token=${resp.body.access_token}`,data)
                                                .then(resp => {
                                                  let surveyPage = new SurveyPage({
                                                    pageId: pages[z].pageId,
                                                    userId: req.user._id,
                                                    subscriberId: subscribers[j].senderId,
                                                    surveyId: survey._id,
                                                    seen: false,
                                                    companyId: companyUser.companyId
                                                  })

                                                  SurveyPageDataLayer.savePage(surveyPage)
                                                  .then(updated => {
                                                  })
                                                  .catch(error => {
                                                    return res.status(500).json({status: 'failed', description: error})
                                                  })
                                                })
                                                  .catch(error => {
                                                    return res.status(500).json({status: 'failed', description: error})
                                                  })
                                            } else {
                                              logger.serverLog(TAG, 'agent was engaged just 30 minutes ago ')
                                              let timeNow = new Date()
                                              let automatedQueueMessage = {
                                                automatedMessageId: survey._id,
                                                subscriberId: subscribers[j]._id,
                                                companyId: companyUser.companyId,
                                                type: 'survey',
                                                scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)
                                              }

                                              AutomationQueueDataLayer.createAutomationQueueObject(automatedQueueMessage)
                                              .then(success => {
                                              })
                                            }
                                          })
                                        })
                                          .catch(error => {
                                            return res.status(500).json({status: 'failed', description: error})
                                          })
                                        })
                                        .catch(error => {
                                          return res.status(500).json({status: 'failed', description: error})
                                        })
                                    }
                                  })
                                })
                              })
                              .catch(error => {
                                return res.status(500).json({status: 'failed', description: error})
                              })
                            })
                            .catch(error => {
                              return res.status(500).json({status: 'failed', description: error})
                            })
                          }
                        }
                        return res.status(200)
                        .json({status: 'success', payload: 'Survey sent successfully.'})
                      })
                    } else {
                      return res.status(404)
                      .json({status: 'failed', description: 'Survey Questions not found'})
                    }
                  })
                  .catch(error => {
                    return res.status(500).json({status: 'failed', description: error})
                  })
                })
                .catch(error => {
                  return res.status(500).json({status: 'failed', description: error})
                })
              })
              .catch(error => {
                return res.status(500).json({status: 'failed', description: error})
              })
            })
            .catch(error => {
              return res.status(500).json({status: 'failed', description: error})
            })
          })
          .catch(error => {
            return res.status(500).json({status: 'failed', description: error})
          })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', description: error})
        })
      })
      .catch(error => {
        return res.status(500).json({status: 'failed', description: error})
      })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', description: error})
    })
  })
  .catch(error => {
    return res.status(500).json({status: 'failed', description: error})
  })
}

exports.deleteSurvey = function (req, res) {
  surveyDataLayer.findServeyById(req)
     .then(survey => {
       if (!survey) {
         return res.status(404)
          .json({status: 'failed', description: 'Record not found'})
       }
       surveyDataLayer.removeSurvey(survey)
      .then(success => {
        SurveyPageDataLayer.findSurveyPagesById(req)
        .then(surveypages => {
          surveypages.forEach(surveypage => {
            SurveyPageDataLayer.removeSurvey(survey)
            .then(success => {

            })
            .catch(error => {
              return res.status(500).json({status: 'failed', description: error})
            })
          })

          surveyResponseDataLayer.findSurveyResponseById(req)
          .then(surveyresponses => {
            surveyresponses.forEach(surveyresponse => {
              surveyResponseDataLayer.removeResponse(surveyresponse)
              .then(success => {
              })
              .catch(error => {
                return res.status(500).json({status: 'failed', description: error})
              })
            })
            surveyQuestionsDataLayer.findSurveyQuestionById(req)
            .then(surveyquestions => {
              surveyquestions.forEach(surveyquestion => {
                surveyQuestionsDataLayer.removeQuestion(surveyquestions)
                .then(success => {
                })
                .catch(error => {
                  return res.status(500).json({status: 'failed', description: error})
                })
              })

              return res.status(200).json({status: 'success'})
            })

            .catch(error => {
              return res.status(500).json({status: 'failed', description: error})
            })
          })

          .catch(error => {
            return res.status(500).json({status: 'failed', description: error})
          })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', description: error})
        })
      })
      .catch(error => {
        return res.status(500).json({status: 'failed', description: error})
      })
     })
     .catch(error => {
       return res.status(500).json({status: 'failed', description: error})
     })
}
