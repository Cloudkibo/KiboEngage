const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/surveyResponse.controller.js'
const needle = require('needle')
const SurveysDataLayer = require('../surveys/surveys.datalayer')
const SurveyResponseDataLayer = require('../surveys/surveyresponse.datalayer')
const SurveyQuestionDataLayer = require('../surveys/surveyquestion.datalayer')
const {callApi} = require('../utility')
const notificationsUtility = require('../notifications/notifications.utility')
const { saveLiveChat, preparePayloadFacebook } = require('../../global/livechat')
let { sendOpAlert } = require('./../../global/operationalAlert')
const sequenceController = require('./sequence.controller')

exports.surveyResponse = function (req, res) {
  for (let i = 0; i < req.body.entry[0].messaging.length; i++) {
    const event = req.body.entry[0].messaging[i]
    let resp = JSON.parse(event.postback.payload)
    SurveysDataLayer.findOneSurvey(resp.survey_id)
      .then(survey => {
        callApi(`subscribers/query`, 'post', { senderId: req.body.entry[0].messaging[0].sender.id, companyId: survey.companyId, completeInfo: true })
          .then(subscribers => {
            let subscriber = subscribers[0]
            if (subscriber) {
              let message = preparePayloadFacebook(subscriber, subscriber.pageId, {componentType: 'text', text: event.postback.title})
              saveLiveChat(message)
              savesurvey(event, subscriber)
              sequenceController.handlePollSurveyResponse({companyId: survey.companyId, subscriberId: subscriber._id, payload: resp})
              res.status(200).json({
                status: 'success',
                description: `received the payload`
              })
            } else {
              return res.status(500).json({status: 'failed', description: `subscriber not found`})
            }
          })
          .catch(err => {
            const message = err || 'Failed to fetch subscriber'
            logger.serverLog(message, `${TAG}: exports.surveyResponse`, req.body, {user: req.user}, 'error')
            return res.status(500).json({status: 'failed', description: `Failed to fetch subscriber ${err}`})
          })
      })
      .catch(err => {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: surveyResponse`, req.body, {user: req.user}, 'error')
        return res.status(500).json({status: 'failed', description: `Failed to fetch survey ${err}`})
      })
  }
}
function savesurvey (req, subscriber) {
  // this is the response of survey question
  // first save the response of survey
  // find subscriber from sender id
  var resp = JSON.parse(req.postback.payload)
  // eslint-disable-next-line no-unused-vars
  const surveybody = {
    response: resp.option, // response submitted by subscriber
    surveyId: resp.survey_id,
    questionId: resp.question_id,
    subscriberId: subscriber._id
  }
  callApi(`webhooks/query`, 'post', { pageId: req.recipient.id })
    .then(webhook => {
      webhook = webhook[0]
      if (webhook && webhook.isEnabled) {
        needle.get(webhook.webhook_url, (err, r) => {
          if (err) {
            const message = err || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: savesurvey`, req.body, {user: req.user}, 'error')
          } else if (r.statusCode === 200) {
            if (webhook && webhook.optIn.SURVEY_RESPONSE) {
              var data = {
                subscription_type: 'SURVEY_RESPONSE',
                payload: JSON.stringify({ sender: req.sender, recipient: req.recipient, timestamp: req.timestamp, response: resp.option, surveyId: resp.survey_id, questionId: resp.question_id })
              }
              needle.post(webhook.webhook_url, data,
                (error, response) => {
                  if (error) {
                    const message = err || 'Internal Server Error'
                    logger.serverLog(message, `${TAG}: savesurvey`, req.body, {user: req.user}, 'error')
                  }
                })
            }
          } else {
            notificationsUtility.saveNotification(webhook)
          }
        })
      }
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: savesurvey`, req.body, {user: req.user}, 'error')
    })
  SurveyResponseDataLayer.genericUpdateForResponse({
    surveyId: resp.survey_id,
    questionId: resp.question_id,
    subscriberId: subscriber._id
  }, { response: resp.option, datetime: Date.now() }, { upsert: true })
    .then(surveyresponse => {
      // send the next question
      SurveyQuestionDataLayer.genericfindForSurveyQuestions({surveyId: resp.survey_id, _id: { $gt: resp.question_id }})
        .then(questions => {
          if (questions.length > 0) {
            let firstQuestion = questions[0]
            // create buttons
            const buttons = []
            let nextQuestionId = 'nil'
            if (questions.length > 1) {
              nextQuestionId = questions[1]._id
            }

            for (let x = 0; x < firstQuestion.options.length; x++) {
              buttons.push({
                type: 'postback',
                title: firstQuestion.options[x],
                payload: JSON.stringify({
                  survey_id: resp.survey_id,
                  option: firstQuestion.options[x],
                  action: firstQuestion.actions ? firstQuestion.actions[x].action : '',
                  sequenceId: firstQuestion.actions ? firstQuestion.actions[x].sequenceId : '',
                  question_id: firstQuestion._id,
                  nextQuestionId,
                  userToken: resp.userToken
                })
              })
            }
            needle.get(
              `https://graph.facebook.com/v6.0/${req.recipient.id}?fields=access_token&access_token=${resp.userToken}`,
              (err3, response) => {
                if (err3) {
                  const message = err3 || 'Page access token from graph api Error'
                  logger.serverLog(message, `${TAG}: savesurvey`, req.body, {user: req.user}, 'error')
                }
                if (response.body.error) {
                  sendOpAlert(response.body.error, 'survey response in kiboengage', '', '', '')
                }
                const messageData = {
                  attachment: {
                    type: 'template',
                    payload: {
                      template_type: 'button',
                      text: firstQuestion.statement,
                      buttons
                    }
                  }
                }
                const data = {
                  messaging_type: 'RESPONSE',
                  recipient: JSON.stringify({ id: req.sender.id }), // this is the subscriber id
                  message: JSON.stringify(messageData)
                }
                needle.post(
                  `https://graph.facebook.com/v6.0/me/messages?access_token=${response.body.access_token}`,
                  data, (err4, respp) => {
                    if (respp.body.error) {
                      sendOpAlert(respp.body.error, 'survey response in kiboengage', '', '', '')
                    }
                  })
              })
          } else { // else send thank you message
            SurveysDataLayer.genericUpdateForSurvey({ _id: resp.survey_id },
              { $inc: { isresponded: 1 - surveyresponse.nModified } }, {})
              .then(updated => {
              })
              .catch(err => {
                const message = err || 'Failed to update survey'
                logger.serverLog(message, `${TAG}: savesurvey`, req.body, {user: req.user}, 'error')
              })
            needle.get(
              `https://graph.facebook.com/v6.0/${req.recipient.id}?fields=access_token&access_token=${resp.userToken}`,
              (err3, response) => {
                if (err3) {
                  const message = err3 || 'Page access token from graph api Error'
                  logger.serverLog(message, `${TAG}: savesurvey`, req.body, {user: req.user}, 'error')
                }
                if (response.body.error) {
                  const message = response.body.error || 'Page access token from graph api Error'
                  logger.serverLog(message, `${TAG}: savesurvey`, req.body, {user: req.user}, 'error')
                }
                const messageData = {
                  text: 'Thank you. Response submitted successfully.'
                }
                const data = {
                  messaging_type: 'RESPONSE',
                  recipient: { id: req.sender.id }, // this is the subscriber id
                  message: messageData
                }
                needle.post(
                  `https://graph.facebook.com/v6.0/me/messages?access_token=${response.body.access_token}`,
                  data, (err4, respp) => {
                    if (respp.body.error) {
                      sendOpAlert(respp.body.error, 'survey response in kiboengage', '', '', '')
                    }
                    if (err4) {
                    }
                  })
              })
          }
        })
        .catch(err => {
          const message = err || 'Failed to fetch questions'
          logger.serverLog(message, `${TAG}: savesurvey`, req.body, {user: req.user}, 'error')
        })
    })
    .catch(err => {
      const message = err || 'Failed to update survey response'
      logger.serverLog(message, `${TAG}: savesurvey`, req.body, {user: req.user}, 'error')
    })
}
