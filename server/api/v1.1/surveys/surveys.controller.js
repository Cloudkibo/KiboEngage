/* eslint-disable camelcase */
/**
 * Created by sojharo on 27/07/2017.
 */

const logger = require('../../../components/logger')
const surveyQuestionsDataLayer = require('./surveyquestion.datalayer')
const SurveyPageDataLayer = require('../page_survey/page_survey.datalayer')
const AutomationQueueDataLayer = require('./../automationQueue/automationQueue.datalayer')
const TAG = 'api/surveys/surveys.controller.js'
const webhookUtility = require('./../notifications/notifications.utility')
const surveyDataLayer = require('./surveys.datalayer')
const surveyLogicLayer = require('./surveys.logiclayer')
const surveyResponseDataLayer = require('./surveyresponse.datalayer')
const callApi = require('../utility/index')
let _ = require('lodash')
const async = require('async')
const broadcastApi = require('../../global/broadcastApi')
const needle = require('needle')
const utility = require('./../broadcasts/broadcasts.utility')
const compUtility = require('../../../components/utility')
const { saveLiveChat, preparePayload } = require('../../global/livechat')

exports.allSurveys = function (req, res) {
  callApi.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
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
                      res.status(200).json({
                        status: 'success',
                        payload: {surveys: surveys, surveypages: surveypages, responsesCount: responsesCount, count: surveys.length > 0 && surveysCount.length > 0 ? surveysCount[0].count : ''}
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
          return res.status(500).json({status: 'failed', payload: `Failed due to survey count ${error}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed due to company user ${JSON.stringify(error)}`})
    })
}

exports.create = function (req, res) {
  callApi.callApi('featureUsage/planQuery', 'post', {planId: req.user.currentPlan._id}, req.headers.authorization)
    .then(planUsage => {
      planUsage = planUsage[0]
      callApi.callApi('featureUsage/companyQuery', 'post', {companyId: req.user.companyId}, req.headers.authorization)
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
              return res.status(500).json({status: 'Failed', payload: `failed to create survey ${err}`})
            }
            let survey = results[1]
            res.status(200).json({status: 'Success', payload: survey})
          })
        })
        .catch(error => {
          return res.status(500).json({status: `failed to companyUsage ${error}`, payload: error})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed to plan usage', payload: error})
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
                    return res.status(500).json({status: `failed ${error}`, payload: error})
                  })
              }
              return res.status(200)
                .json({status: 'success', payload: req.body.survey})
            })
            .catch(error => {
              return res.status(500).json({status: `failed ${error}`, payload: error})
            })
        })
        .catch(error => {
          return res.status(500).json({status: `failed ${error}`, payload: error})
        })
    })
    .catch(error => {
      return res.status(500).json({status: `failed ${error}`, payload: error})
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
              return res.status(200)
                .json({status: 'success', payload: {survey, questions, responses}})
            })
            .catch(error => {
              return res.status(500).json({status: `failed du to survey ${error}`, payload: error})
            })
        })
        .catch(error => {
          return res.status(500).json({status: `failed due to questions ${error}`, payload: error})
        })
    })
    .catch(error => {
      return res.status(500).json({status: `failed due to response ${error}`, payload: error})
    })
}

// Get a single survey
exports.showQuestions = function (req, res) {
  surveyDataLayer.findOneSurvey(req.params.id)
    .then(survey => {
      surveyQuestionsDataLayer.findSurveyWithId(survey._id)
        .then(questions => {
          return res.status(200)
            .json({status: 'success', payload: {survey, questions}})
        })
        .catch(error => {
          return res.status(500).json({status: `failed ${error}`, payload: error})
        })
    })
    .catch(error => {
      return res.status(500).json({status: `failed ${error}`, payload: error})
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
        return res.status(500).json({status: 'failed', description: error})
      })
  }

  surveyDataLayer.genericUpdateForSurvey({_id: req.body.surveyId}, {$inc: {isresponded: 1}})
    .then(success => {
      return res.status(200).json({status: 'success', payload: 'Response submitted successfully'})
    })
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
  callApi.callApi('featureUsage/planQuery', 'post', {planId: req.user.currentPlan._id}, req.headers.authorization)
    .then(planUsage => {
      planUsage = planUsage[0]
      callApi.callApi('featureUsage/companyQuery', 'post', {companyId: req.user.companyId}, req.headers.authorization)
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
          return res.status(500).json({status: 'failed', description: error})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', description: error})
    })
}
exports.sendSurveyDirectly = function (req, res) {
  let abort = false
  callApi.callApi('featureUsage/planQuery', 'post', {planId: req.user.currentPlan._id}, req.headers.authorization)
    .then(planUsage => {
      planUsage = planUsage[0]
      callApi.callApi('featureUsage/companyQuery', 'post', {companyId: req.user.companyId}, req.headers.authorization)
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
              return res.status(500).json({status: 'failed', payload: `Failed to create survey ${JSON.stringify(err)}`})
            }
            let surveyCreated = result[0]
            req.body._id = surveyCreated._id
            sendSurvey(req, res, planUsage, companyUsage, abort)
          })
        })
        .catch(error => {
          return res.status(500).json({status: `failed ${error}`, description: error})
        })
    })
    .catch(error => {
      return res.status(500).json({status: `failed ${error}`, description: error})
    })
}

exports.deleteSurvey = function (req, res) {
  surveyDataLayer.deleteForSurveys(req.params.id)
    .then(survey => {
      SurveyPageDataLayer.deleteSurveyPage({surveyId: req.params.id})
        .then(surveypages => {
          surveyResponseDataLayer.removeAllSurveyResponse(req.params.id)
            .then(surveyresponses => {
              surveyQuestionsDataLayer.removeAllSurveyQuestionsQuery(req.params.id)
                .then(success => {
                  return res.status(200).json({status: 'success'})
                })

                .catch(error => {
                  return res.status(500).json({status: `failed ${error}`, description: `failed to survey responses  ${JSON.stringify(error)}`})
                })
            })
            .catch(error => {
              return res.status(500).json({status: `failed ${error}`, description: `failed due to survey remove  ${JSON.stringify(error)}`})
            })
        })
        .catch(error => {
          return res.status(500).json({status: `failed ${error}`, description: `failed due to survey remove  ${JSON.stringify(error)}`})
        })
    })
}

function sendSurvey (req, res, planUsage, companyUsage, abort) {
  let pagesFindCriteria = surveyLogicLayer.pageFindCriteria(req)
  callApi.callApi(`pages/query`, 'post', pagesFindCriteria, req.headers.authorization)
    .then(pages => {
      let page = pages[0]
      callApi.callApi(`user/query`, 'post', {_id: page.userId}, req.headers.authorization)
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
              surveyDataLayer.findOneSurvey(req.body._id)
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
                    let ListFindCriteria = {
                      companyId: req.user.companyId
                    }
                    ListFindCriteria = _.merge(ListFindCriteria,
                      {
                        _id: {
                          $in: req.body.segmentationList
                        }
                      })
                    if (page.subscriberLimitForBatchAPI < req.body.subscribersCount) {
                      let messageData = {
                        attachment: {
                          type: 'template',
                          payload: {
                            template_type: 'button',
                            text: `${survey.description}\n${first_question.statement}`,
                            buttons
                          }
                        }
                      }
                      broadcastApi.callMessageCreativesEndpoint(messageData, page.accessToken, 'survey')
                        .then(messageCreative => {
                          console.log('messageCreative')
                          if (messageCreative.status === 'success') {
                            const messageCreativeId = messageCreative.message_creative_id
                            console.log('before pagetags', req.user.companyId)
                            callApi.callApi('tags/query', 'post', {companyId: req.user.companyId, pageId: page._id}, req.headers.authorization)
                              .then(pageTags => {
                                console.log('pageTags')
                                const limit = Math.ceil(req.body.subscribersCount / 10000)
                                for (let i = 0; i < limit; i++) {
                                  let labels = []
                                  let unsubscribeTag = pageTags.filter((pt) => pt.tag === `_${page.pageId}_unsubscribe`)
                                  let pageIdTag = pageTags.filter((pt) => pt.tag === `_${page.pageId}_${i + 1}`)
                                  let notlabels = unsubscribeTag.length > 0 && [unsubscribeTag[0].labelFbId]
                                  pageIdTag.length > 0 && labels.push(pageIdTag[0].labelFbId)
                                  if (req.body.isList) {
                                    callApi.callApi(`lists/query`, 'post', ListFindCriteria, req.headers.authorization)
                                      .then(lists => {
                                        lists = lists.map((l) => l.listName)
                                        let temp = pageTags.filter((pt) => lists.includes(pt.tag)).map((pt) => pt.labelFbId)
                                        labels = labels.concat(temp)
                                      })
                                      .catch(err => {
                                        return res.status(500).json({
                                          status: 'failed',
                                          description: `Failed to apply list segmentation ${JSON.stringify(err)}`
                                        })
                                      })
                                  } else {
                                    if (req.body.segmentationGender.length > 0) {
                                      let temp = pageTags.filter((pt) => req.body.segmentationGender.includes(pt.tag)).map((pt) => pt.labelFbId)
                                      labels = labels.concat(temp)
                                    }
                                    if (req.body.segmentationLocale.length > 0) {
                                      let temp = pageTags.filter((pt) => req.body.segmentationLocale.includes(pt.tag)).map((pt) => pt.labelFbId)
                                      labels = labels.concat(temp)
                                    }
                                    if (req.body.segmentationTags.length > 0) {
                                      let temp = pageTags.filter((pt) => req.body.segmentationTags.includes(pt._id)).map((pt) => pt.labelFbId)
                                      labels = labels.concat(temp)
                                    }
                                  }
                                  broadcastApi.callBroadcastMessagesEndpoint(messageCreativeId, labels, notlabels, page.accessToken)
                                    .then(response => {
                                      if (i === limit - 1) {
                                        if (response.status === 'success') {
                                          callApi.callApi('surveys', 'put', {purpose: 'updateOne', match: {_id: req.body._id}, updated: {messageCreativeId, broadcastFbId: response.broadcast_id, APIName: 'broadcast_api'}}, '', 'kiboengage')
                                            .then(updated => {
                                              return res.status(200)
                                                .json({status: 'success', description: 'Survey sent successfully!'})
                                            })
                                            .catch(err => {
                                              return res.status(500).json({
                                                status: 'failed',
                                                description: `Failed to send survey ${JSON.stringify(err)}`
                                              })
                                            })
                                        } else {
                                          return res.status(500).json({
                                            status: 'failed',
                                            description: `Failed to send survey ${JSON.stringify(response.description)}`
                                          })
                                        }
                                      }
                                    })
                                    .catch(err => {
                                      return res.status(500).json({
                                        status: 'failed',
                                        description: `Failed to send survey ${JSON.stringify(err)}`
                                      })
                                    })
                                }
                              })
                              .catch(err => {
                                return res.status(500).json({
                                  status: 'failed',
                                  description: `Failed to find tags ${JSON.stringify(err)}`
                                })
                              })
                          } else {
                            return res.status(500).json({
                              status: 'failed',
                              description: `Failed to send survey ${JSON.stringify(messageCreative.description)}`
                            })
                          }
                        })
                        .catch(err => {
                          console.log('error 5')
                          return res.status(500).json({
                            status: 'failed',
                            description: `Failed to send survey ${JSON.stringify(err)}`
                          })
                        })
                    } else {
                      if (req.body.isList === true) {
                        callApi.callApi(`lists/query`, 'post', ListFindCriteria, req.headers.authorization)
                          .then(lists => {
                            let subsFindCriteria = {pageId: page._id, companyId: page.companyId}
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
                            let surveyData = {
                              survey,
                              first_question,
                              buttons
                            }
                            sendToSubscribers(req, res, subsFindCriteria, page, surveyData, planUsage, companyUsage, abort)
                          })
                          .catch(error => {
                            return res.status(500).json({status: 'failed', description: error})
                          })
                      } else {
                        let subscriberFindCriteria = {
                          pageId: page._id,
                          companyId: page.companyId,
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
                        let surveyData = {
                          survey,
                          first_question,
                          buttons
                        }
                        sendToSubscribers(req, res, subscriberFindCriteria, page, surveyData, planUsage, companyUsage, abort)
                      }
                    }
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
          return res.status(500).json({status: 'failed', payload: `Failed to fetch connected user ${error}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch page ${error}`})
    })
}

function sendToSubscribers (req, res, subsFindCriteria, page, surveyData, planUsage, companyUsage, abort) {
  callApi.callApi(`subscribers/query`, 'post', subsFindCriteria, req.headers.authorization)
    .then(subscribers => {
      if (subscribers.length === 0) {
        return res.status(500).json({status: 'failed', description: `No subscribers match the selected criteria`})
      }
      utility.applyTagFilterIfNecessary(req, subscribers, (taggedSubscribers) => {
        subscribers = taggedSubscribers
        utility.applySurveyFilterIfNecessary(req, subscribers, (repliedSubscribers) => {
          subscribers = repliedSubscribers
          for (let j = 0; j < subscribers.length && !abort; j++) {
            callApi.callApi(`featureUsage/updateCompany`, 'put', {query: {companyId: req.user.companyId}, newPayload: { $inc: { surveys: 1 } }, options: {}}, req.headers.authorization)
              .then(updated => {
                if (planUsage.surveys !== -1 && companyUsage.surveys >= planUsage.surveys) {
                  abort = true
                }
                const messageData = {
                  attachment: {
                    type: 'template',
                    payload: {
                      template_type: 'button',
                      text: `${surveyData.survey.description}\n${surveyData.first_question.statement}`,
                      buttons: surveyData.buttons
                    }
                  }
                }
                const data = {
                  messaging_type: 'MESSAGE_TAG',
                  recipient: JSON.stringify({id: subscribers[j].senderId}), // this is the subscriber id
                  message: JSON.stringify(messageData),
                  tag: 'NON_PROMOTIONAL_SUBSCRIPTION'
                }

                // checks the age of function using callback
                compUtility.checkLastMessageAge(subscribers[j].senderId, req, (err, isLastMessage) => {
                  if (err) {
                    logger.serverLog(TAG, 'inside error')
                    return logger.serverLog(TAG, 'Internal Server Error on Setup ' + JSON.stringify(err))
                  }
                  if (isLastMessage) {
                    logger.serverLog(TAG, 'inside suvery send' + JSON.stringify(data))
                    needle.post(
                      `https://graph.facebook.com/v2.6/me/messages?access_token=${page.accessToken}`,
                      data, (err, resp) => {
                        if (err) {
                          return res.status(500).json({
                            status: 'failed',
                            description: JSON.stringify(err)
                          })
                        }
                        let message = preparePayload(subscribers[j], page, messageData)
                        saveLiveChat(message)
                        let surveyPage = {
                          pageId: page.pageId,
                          userId: req.user._id,
                          subscriberId: subscribers[j].senderId,
                          surveyId: req.body._id,
                          seen: false,
                          sent: false,
                          companyId: req.user.companyId
                        }

                        SurveyPageDataLayer.createForSurveyPage(surveyPage)
                          .then(success => {
                            require('./../../../config/socketio').sendMessageToClient({
                              room_id: req.user.companyId._id,
                              body: {
                                action: 'survey_send',
                                payload: {
                                  survey_id: surveyData.survey._id,
                                  user_id: req.user._id,
                                  user_name: req.user.name,
                                  company_id: req.user.companyId
                                }
                              }
                            })
                            if (j === subscribers.length - 1 || abort) {
                              return res.status(200).json({status: 'success', payload: 'Survey sent successfully.'})
                            }
                          })
                          .catch(error => {
                            return res.status(500).json({status: 'failed', description: error})
                          })
                      })
                  } else {
                    logger.serverLog(TAG, 'agent was engaged just 30 minutes ago ')
                    let timeNow = new Date()
                    let automatedQueueMessage = {
                      automatedMessageId: req.body._id,
                      subscriberId: subscribers[j]._id,
                      companyId: req.user.companyId,
                      type: 'survey',
                      scheduledTime: timeNow.setMinutes(timeNow.getMinutes() + 30)
                    }

                    AutomationQueueDataLayer.createAutomationQueueObject(automatedQueueMessage)
                      .then(success => {
                        if (j === subscribers.length - 1 || abort) {
                          return res.status(200).json({status: 'success', payload: 'Survey sent successfully.'})
                        }
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
          }
        })
      })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', description: error})
    })
}

function createSurvey (req, callback) {
  let surveyPayload = surveyLogicLayer.createSurveyPayload(req)
  surveyDataLayer.createSurvey(surveyPayload)
    .then(survey => {
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
            callback(error)
          })
      }
    })
    .catch(error => {
      callback(error)
    })
}

function sendWebhook (req, callback) {
  let pagesFindCriteria = surveyLogicLayer.pageFindCriteria(req)
  callApi.callApi(`pages/query`, 'post', pagesFindCriteria, req.headers.authorization)
    .then(pages => {
      let page = pages[0]
      callApi.callApi(`webhooks/query`, 'post', {pageId: page.pageId}, req.headers.authorization)
        .then(webhook => {
          webhook = webhook[0]
          if (webhook && webhook.isEnabled) {
            needle.get(webhook.webhook_url, (err, r) => {
              if (err) {
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
          callback(error)
        })
    })
    .catch(error => {
      callback(error)
    })
}
