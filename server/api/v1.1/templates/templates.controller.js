const dataLayer = require('./template.datalayer')
const QuestionsurveydataLayer = require('./surveyQuestion.datalayer')
const logicLayer = require('./template.logiclayer')
const callApi = require('../utility/index')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.allPolls = function (req, res) {
  dataLayer.allPolls()
    .then(polls => {
      sendSuccessResponse(res, 200, polls)
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.getAllPolls = function (req, res) {
  if (req.body.first_page === 'first') {
    let findCriteria = logicLayer.getCriterias(req)
    dataLayer.pollTemplateaggregateCount(findCriteria)
      .then(pollsCount => {
        dataLayer.pollTemplateaggregateLimit({findCriteria, req})
          .then(polls => {
            sendSuccessResponse(res, 200, {polls: polls, count: polls.length > 0 ? pollsCount[0].count : ''})
          })
          .catch(err => {
            sendErrorResponse(res, 500, JSON.stringify(err))
          })
      })
      .catch(err => {
        sendErrorResponse(res, 500, JSON.stringify(err))
      })
  } else if (req.body.first_page === 'next') {
    let recordsToSkip = Math.abs(((req.body.requested_page - 1) - (req.body.current_page))) * req.body.number_of_records
    let findCriteria = logicLayer.getCriterias(req)
    dataLayer.pollTemplateaggregateCount(findCriteria)
      .then(pollsCount => {
        dataLayer.pollTemplateaggregateLimitNextPrevious({findCriteria, recordsToSkip, req})
          .then(polls => {
            sendErrorResponse(res, 200, {polls: polls, count: polls.length > 0 ? pollsCount[0].count : ''})
          })
          .catch(error => {
            sendErrorResponse(res, 500, JSON.stringify(error))
          })
      })
      .catch(error => {
        sendErrorResponse(res, 500, JSON.stringify(error))
      })
  } else if (req.body.first_page === 'previous') {
    let recordsToSkip = Math.abs(((req.body.requested_page) - (req.body.current_page - 1))) * req.body.number_of_records
    let findCriteria = logicLayer.getCriterias(req)
    dataLayer.pollTemplateaggregateCount(findCriteria)
      .then(pollsCount => {
        dataLayer.pollTemplateaggregateLimitNextPrevious({findCriteria, recordsToSkip, req})
          .then(polls => {
            sendSuccessResponse(res, 200, {polls: polls.reverse(), count: polls.length > 0 ? pollsCount[0].count : ''})
          })
          .catch(error => {
            sendErrorResponse(res, 500, JSON.stringify(error))
          })
      })
      .catch(error => {
        sendErrorResponse(res, 500, JSON.stringify(error))
      })
  }
}

exports.getAllSurveys = function (req, res) {
  if (req.body.first_page === 'first') {
    let findCriteria = logicLayer.getCriterias(req)
    dataLayer.surveyTemplateaggregateCount(findCriteria)
      .then(surveysCount => {
        dataLayer.surveyTemplateaggregateLimit({findCriteria, req})
          .then(surveys => {
            sendSuccessResponse(res, 200, {surveys: surveys, count: surveys.length > 0 ? surveysCount.length > 0 ? surveysCount[0].count : 0 : 0})
          })
          .catch(err => {
            sendErrorResponse(res, 500, err)
          })
      })
      .catch(err => {
        sendErrorResponse(res, 500, err)
      })
  } else if (req.body.first_page === 'next') {
    let recordsToSkip = Math.abs(((req.body.requested_page - 1) - (req.body.current_page))) * req.body.number_of_records
    let findCriteria = logicLayer.getCriterias(req)
    dataLayer.surveyTemplateaggregateCount(findCriteria)
      .then(surveysCount => {
        dataLayer.surveyTemplateaggregateLimitNextPrevious({findCriteria, recordsToSkip, req})
          .then(surveys => {
            sendSuccessResponse(res, 200, {surveys: surveys, count: surveys.length > 0 ? surveysCount[0].count : ''})
          })
          .catch(err => {
            sendErrorResponse(res, 500, err)
          })
      })
      .catch(err => {
        sendErrorResponse(res, 500, err)
      })
  } else if (req.body.first_page === 'previous') {
    let recordsToSkip = Math.abs(((req.body.requested_page) - (req.body.current_page - 1))) * req.body.number_of_records
    let findCriteria = logicLayer.getCriterias(req)
    dataLayer.surveyTemplateaggregateCount(findCriteria)
      .then(surveysCount => {
        dataLayer.surveyTemplateaggregateLimitNextPrevious({findCriteria, recordsToSkip, req})
          .then(surveys => {
            sendSuccessResponse(res, 200, {surveys: surveys.reverse(), count: surveys.length > 0 ? surveysCount[0].count : ''})
          })
          .catch(err => {
            sendErrorResponse(res, 500, err)
          })
      })
      .catch(err => {
        sendErrorResponse(res, 500, err)
      })
  }
}

exports.allSurveys = function (req, res) {
  dataLayer.allSurvey()
    .then(surveys => {
      sendSuccessResponse(res, 200, surveys)
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.createPoll = function (req, res) {
  let pollPayload = {
    title: req.body.title,
    statement: req.body.statement,
    options: req.body.options,
    category: req.body.category
  }
  // save model to MongoDB
  dataLayer.createPoll(pollPayload)
    .then(pollCreated => {
      sendSuccessResponse(res, 200, pollCreated)
    })
    .catch(err => {
      sendErrorResponse(res, 500, 'failed to saved polls')
    })
}
exports.createSurvey = function (req, res) {
  let surveyPayload = {
    title: req.body.survey.title,
    description: req.body.survey.description,
    category: req.body.survey.category
  }
  dataLayer.createSurveys(surveyPayload)
    .then(survey => {
      // after survey is created, create survey questions
      for (let question in req.body.questions) {
        let options = []
        options = req.body.questions[question].options
        const surveyQuestion = {
          statement: req.body.questions[question].statement, // question statement
          options, // array of question options
          surveyId: survey._id
        }
        QuestionsurveydataLayer.createQuestionSurveys(surveyQuestion)
          .then(question1 => {
          })
          .catch(err => {
          })
      }
      sendSuccessResponse(res, 200, survey)
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.allCategories = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      dataLayer.CategoryFind(companyUser)
        .then(categories => {
          sendSuccessResponse(res, 200, categories)
        })
        .catch(err => {
          sendErrorResponse(res, 500, err)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.createCategory = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      let categoryPayload = logicLayer.createDataCategory({req, companyUser})
      if (req.user.isSuperUser) {
        categoryPayload.createdBySuperUser = true
      }
      dataLayer.createCategory(categoryPayload)
        .then(categoryCreated => {
          sendSuccessResponse(res, 200, categoryCreated)
        })
        .catch(err => {
          sendErrorResponse(res, 500, err)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.editCategory = function (req, res) {
  let payload = {
    name: req.body.name
  }
  dataLayer.editCategory({_id: req.body._id}, payload)
    .then(categoryCreated => {
      sendSuccessResponse(res, 200, categoryCreated)
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.surveyDetails = function (req, res) {
  dataLayer.findSurveyById(req)
    .then(survey => {
      if (!survey) {
        sendErrorResponse(res, 404, '', 'survey not found')
      }
      dataLayer.findQuestionById(req)
        .then(questions => {
          sendSuccessResponse(res, 200, {survey, questions})
        })
        .catch(err => {
          sendErrorResponse(res, 500, err)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}
exports.pollDetails = function (req, res) {
  dataLayer.findPollById(req.params.pollid)
    .then(poll => {
      if (!poll) {
        sendErrorResponse(res, 404, '', 'survey not found')
      }
      sendSuccessResponse(res, 200, poll)
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.deletePoll = function (req, res) {
  dataLayer.FindByIdPoll(req)
    .then(poll => {
      if (!poll) {
        sendErrorResponse(res, 404, '', 'Record not found')
      }
      dataLayer.removePoll(req.params.id)
        .then(success => {
          sendSuccessResponse(res, 200)
        })
        .catch(err => {
          sendErrorResponse(res, 500, err)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.deleteCategory = function (req, res) {
  dataLayer.pollCategoryById(req)
    .then(category => {
      if (!category) {
        sendErrorResponse(res, 404, '', 'Record not found')
      }
      dataLayer.removeCategory(req.params.id)
        .then(success => {
          sendSuccessResponse(res, 200)
        })
        .catch(error => {
          sendErrorResponse(res, 500, error)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, error)
    })
}

exports.deleteSurvey = function (req, res) {
  dataLayer.surveyFindId(req)
    .then(survey => {
      if (!survey) {
        sendErrorResponse(res, 404, '', 'Record not found')
      }
      dataLayer.removeSurvey(req.params.id)
        .then(success => {
          sendSuccessResponse(res, 200)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.editSurvey = function (req, res) {
  dataLayer.surveyId(req)
    .then(survey => {
      if (!survey) {
        sendErrorResponse(res, 404, '', 'Record not found')
      }
      let payload = {
        title: req.body.survey.title,
        description: req.body.survey.description,
        category: req.body.survey.category
      }
      dataLayer.editSurvey({_id: req.body.survey._id}, payload)
        .then(success => {
          dataLayer.findQuestionSurveyById(req)
            .then(questions => {
              for (let i = 0; i < questions.length; i++) {
                dataLayer.removeQuestion(questions[i]._id)
                  .then(success => {})
                  .catch(err => {
                    sendErrorResponse(res, 500, err)
                  })
              }
              for (let question in req.body.questions) {
                let options = []
                options = req.body.questions[question].options
                const surveyQuestion = {
                  statement: req.body.questions[question].statement, // question statement
                  options, // array of question options
                  surveyId: survey._id
                }
                QuestionsurveydataLayer.createQuestionSurveys(surveyQuestion)
                  .then(survey => {
                  })
                  .catch(err => {
                    sendErrorResponse(res, 500, err)
                  })
              }
              sendSuccessResponse(res, 200, survey)
            })
            .catch(err => {
              sendErrorResponse(res, 500, err)
            })
        })
        .catch(err => {
          sendErrorResponse(res, 500, err)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.editPoll = function (req, res) {
  dataLayer.findPollById(req.body._id)
    .then(poll => {
      if (!poll) {
        sendErrorResponse(res, 404, '', 'Record not found')
      }
      let payload = {
        title: req.body.title,
        statement: req.body.statement,
        options: req.body.options,
        category: req.body.category
      }
      dataLayer.editPoll({_id: req.body._id}, payload)
        .then(success => {
          sendSuccessResponse(res, 200)
        })
        .catch(err => {
          sendErrorResponse(res, 500, err)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.createBroadcast = function (req, res) {
  callApi.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email, populate: 'companyId' })
    .then(companyUser => {
      callApi.callApi(`featureUsage/planQuery`, 'post', {planId: companyUser.companyId.planId})
        .then(planUsage => {
          planUsage = planUsage[0]
          callApi.callApi(`featureUsage/companyQuery`, 'post', {companyId: companyUser.companyId._id})
            .then(companyUsage => {
              companyUsage = companyUsage[0]
              // add paid plan check later
              // if (planUsage.polls !== -1 && companyUsage.polls >= planUsage.polls) {
              //   return res.status(500).json({
              //     status: 'failed',
              //     description: `Your polls limit has reached. Please upgrade your plan to premium in order to create more polls`
              //   })
              // }
              let broadcastPayload = logicLayer.createDataBroadcast(req, companyUser)
              if (req.user.isSuperUser) {
                broadcastPayload.createdBySuperUser = true
              }
              dataLayer.createBroadcast(broadcastPayload)
                .then(broadcastCreated => {
                  if (!req.user.isSuperUser) {
                    callApi.callApi('featureUsage/updateCompany', 'put', {query: {companyId: companyUser.companyId._id}, newPayload: { $inc: { broadcast_templates: 1 } }, options: {}})
                      .then(update => {
                      })
                      .catch(err => {
                        sendErrorResponse(res, 500, err)
                      })
                  }
                  sendSuccessResponse(res, 200, broadcastCreated)
                })
                .catch(err => {
                  sendErrorResponse(res, 500, err)
                })
            })
            .catch(err => {
              sendErrorResponse(res, 500, err)
            })
        })
        .catch(err => {
          sendErrorResponse(res, 500, err)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.allBroadcasts = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      dataLayer.broadcastFind(companyUser)
        .then(broadcasts => {
          sendSuccessResponse(res, 200, broadcasts)
        })
        .catch(err => {
          sendErrorResponse(res, 500, err)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.getAllBroadcasts = function (req, res) {
  /*
  body = {
    first_page:
    last_id:
    number_of_records:
    filter_criteria: {
      search_value:
      category_value:
    }
  }
  */

  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      if (req.body.first_page === 'first') {
        let findCriteria = logicLayer.getCriteriasBroadcast({req, companyUser})
        dataLayer.broadcastTemplateaggregateCount(findCriteria)
          .then(broadcastsCount => {
            dataLayer.broadcastTemplateaggregateLimit({findCriteria, req})
              .then(broadcasts => {
                sendSuccessResponse(res, 200, {broadcasts: broadcasts, count: broadcasts.length > 0 ? broadcastsCount[0].count : ''})
              })
              .catch(err => {
                sendErrorResponse(res, 500, err)
              })
          })
          .catch(err => {
            sendErrorResponse(res, 500, err)
          })
      } else if (req.body.first_page === 'next') {
        let recordsToSkip = Math.abs(((req.body.requested_page - 1) - (req.body.current_page))) * req.body.number_of_records
        let findCriteria = logicLayer.getCriteriasBroadcast({req, companyUser})
        dataLayer.broadcastTemplateaggregateCount(findCriteria)
          .then(broadcastsCount => {
            dataLayer.broadcastTemplateaggregateLimitNextPrevious({findCriteria, recordsToSkip, req})
              .then(broadcasts => {
                sendSuccessResponse(res, 200, {broadcasts: broadcasts, count: broadcasts.length > 0 ? broadcastsCount[0].count : ''})
              })
              .catch(err => {
                sendErrorResponse(res, 500, err)
              })
          })
          .catch(err => {
            sendErrorResponse(res, 500, err)
          })
      } else if (req.body.first_page === 'previous') {
        let recordsToSkip = Math.abs(((req.body.requested_page) - (req.body.current_page - 1))) * req.body.number_of_records
        let findCriteria = logicLayer.getCriteriasBroadcast({req, companyUser})
        dataLayer.broadcastTemplateaggregateCount(findCriteria)
          .then(broadcastsCount => {
            dataLayer.broadcastTemplateaggregateLimitNextPrevious({findCriteria, recordsToSkip, req})
              .then(broadcasts => {
                sendSuccessResponse(res, 200, {broadcasts: broadcasts, count: broadcasts.length > 0 ? broadcastsCount[0].count : ''})
              })
              .catch(err => {
                sendErrorResponse(res, 500, err)
              })
          })
          .catch(err => {
            sendErrorResponse(res, 500, err)
          })
      }
    })
}

exports.deleteBroadcast = function (req, res) {
  dataLayer.BroadcastFindById(req)
    .then(broadcast => {
      if (!broadcast) {
        sendErrorResponse(res, 404, '', 'Record not fuond')
      }
      dataLayer.removeBroadcast(broadcast)
        .then(success => {
          return res.status(500).json({status: 'success'})
        })
        .catch(error => {
          sendErrorResponse(res, 500, error)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, error)
    })
}

exports.editBroadcast = function (req, res) {
  dataLayer.broadcastFindbyId(req)
    .then(broadcast => {
      if (!broadcast) {
        sendErrorResponse(res, 404, '', 'Record not found')
      }
      let payload = {
        title: req.body.title,
        payload: req.body.payload,
        category: req.body.category
      }
      dataLayer.saveBroadcast({_id: req.body._id}, payload)
        .then(success => {
          sendSuccessResponse(res, 200, broadcast)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, error)
    })
}

exports.broadcastDetails = function (req, res) {
  dataLayer.findBroadcastById(req)
    .then(broadcast => {
      if (!broadcast) {
        sendErrorResponse(res, 404, '', `broadcast not found.`)
      }
      sendSuccessResponse(res, 200, broadcast)
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.createBotTemplate = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      let botTemplatePayload = logicLayer.createDataBots(req)
      if (req.user.isSuperUser) {
        botTemplatePayload.createdBySuperUser = true
      }
      dataLayer.createBot(botTemplatePayload)
        .then(botTemplateCreated => {
          sendSuccessResponse(res, 200, botTemplateCreated)
        })
        .catch(err => {
          sendErrorResponse(res, 500, err)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.allBots = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      dataLayer.botFind(companyUser)
        .then(bots => {
          sendSuccessResponse(res, 200, bots)
        })
        .catch(err => {
          sendErrorResponse(res, 500, err)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.deleteBot = function (req, res) {
  dataLayer.BotFindById(req)
    .then(botFound => {
      if (!botFound) {
        sendErrorResponse(res, 404, '', 'Record not found')
      }
      dataLayer.removeBot(req.body._id)
        .then(success => {
          sendSuccessResponse(res, 200)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.editBot = function (req, res) {
  dataLayer.BotFindById(req)
    .then(botTemplateFound => {
      if (!botTemplateFound) {
        sendErrorResponse(res, 404, '', 'Record not found')
      }
      let payload = {
        title: req.body.title,
        payload: req.body.payload,
        category: req.body.category
      }
      dataLayer.botSave({_id: req.body._id}, payload)
        .then(success => {
          sendSuccessResponse(res, 200, botTemplateFound)
        })
        .catch(err => {
          sendErrorResponse(res, 500, err)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.botDetails = function (req, res) {
  dataLayer.findBotById(req)
    .then(bot => {
      if (!bot) {
        sendErrorResponse(res, 404, '', 'Bot not found')
      }
      sendSuccessResponse(res, 200, bot)
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

// todo temporary bot template for DNC, will be data driven
exports.getPoliticsBotTemplate = function (req, res) {
  let payload = logicLayer.getPoliticsBotTemplate()
  sendSuccessResponse(res, 200, payload)
}
