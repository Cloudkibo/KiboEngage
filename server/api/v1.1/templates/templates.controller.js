const dataLayer = require('./template.datalayer')
const QuestionsurveydataLayer = require('./surveyQuestion.datalayer')
const logicLayer = require('./template.logiclayer')
const callApi = require('../utility/index')
exports.allPolls = function (req, res) {
  dataLayer.allPolls()
    .then(polls => {
      return res.status(200).json({
        status: 'success',
        payload: polls
      })
    })
    .catch(err => {
      return res.status(500).json({status: `failed ${err}`, payload: err})
    })
}

exports.getAllPolls = function (req, res) {
  if (req.body.first_page === 'first') {
    let findCriteria = logicLayer.getCriterias(req)
    dataLayer.pollTemplateaggregateCount(findCriteria)
      .then(pollsCount => {
        dataLayer.pollTemplateaggregateLimit({findCriteria, req})
          .then(polls => {
            res.status(200).json({
              status: 'success',
              payload: {polls: polls, count: polls.length > 0 ? pollsCount[0].count : ''}
            })
          })
          .catch(err => {
            return res.status(500).json({status: `failed ${err}`, payload: ` ${JSON.stringify(err)}`})
          })
      })
      .catch(err => {
        return res.status(500).json({status: `failed ${err}`, payload: ` ${JSON.stringify(err)}`})
      })
  } else if (req.body.first_page === 'next') {
    let recordsToSkip = Math.abs(((req.body.requested_page - 1) - (req.body.current_page))) * req.body.number_of_records
    let findCriteria = logicLayer.getCriterias(req)
    dataLayer.pollTemplateaggregateCount(findCriteria)
      .then(pollsCount => {
        dataLayer.pollTemplateaggregateLimitNextPrevious({findCriteria, recordsToSkip, req})
          .then(polls => {
            res.status(200).json({
              status: 'success',
              payload: {polls: polls, count: polls.length > 0 ? pollsCount[0].count : ''}
            })
          })
          .catch(error => {
            return res.status(500).json({status: `failed ${error}`, payload: ` ${JSON.stringify(error)}`})
          })
      })
      .catch(error => {
        return res.status(500).json({status: `failed ${error}`, payload: ` ${JSON.stringify(error)}`})
      })
  } else if (req.body.first_page === 'previous') {
    let recordsToSkip = Math.abs(((req.body.requested_page) - (req.body.current_page - 1))) * req.body.number_of_records
    let findCriteria = logicLayer.getCriterias(req)
    dataLayer.pollTemplateaggregateCount(findCriteria)
      .then(pollsCount => {
        dataLayer.pollTemplateaggregateLimitNextPrevious({findCriteria, recordsToSkip, req})
          .then(polls => {
            res.status(200).json({
              status: 'success',
              payload: {polls: polls.reverse(), count: polls.length > 0 ? pollsCount[0].count : ''}
            })
          })
          .catch(error => {
            return res.status(500).json({status: `failed ${error}`, payload: ` ${JSON.stringify(error)}`})
          })
      })
      .catch(error => {
        return res.status(500).json({status: `failed ${error}`, payload: ` ${JSON.stringify(error)}`})
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
            res.status(200).json({
              status: 'success',
              payload: {surveys: surveys, count: surveys.length > 0 ? surveysCount.length > 0 ? surveysCount[0].count : 0 : 0}
            })
          })
          .catch(err => {
            return res.status(500).json({status: 'failed', payload: err})
          })
      })
      .catch(err => {
        return res.status(500).json({status: 'failed', payload: err})
      })
  } else if (req.body.first_page === 'next') {
    let recordsToSkip = Math.abs(((req.body.requested_page - 1) - (req.body.current_page))) * req.body.number_of_records
    let findCriteria = logicLayer.getCriterias(req)
    dataLayer.surveyTemplateaggregateCount(findCriteria)
      .then(surveysCount => {
        dataLayer.surveyTemplateaggregateLimitNextPrevious({findCriteria, recordsToSkip, req})
          .then(surveys => {
            res.status(200).json({
              status: 'success',
              payload: {surveys: surveys, count: surveys.length > 0 ? surveysCount[0].count : ''}})
          })
          .catch(err => {
            return res.status(500).json({status: 'failed', payload: err})
          })
      })
      .catch(err => {
        return res.status(500).json({status: 'failed', payload: err})
      })
  } else if (req.body.first_page === 'previous') {
    let recordsToSkip = Math.abs(((req.body.requested_page) - (req.body.current_page - 1))) * req.body.number_of_records
    let findCriteria = logicLayer.getCriterias(req)
    dataLayer.surveyTemplateaggregateCount(findCriteria)
      .then(surveysCount => {
        dataLayer.surveyTemplateaggregateLimitNextPrevious({findCriteria, recordsToSkip, req})
          .then(surveys => {
            res.status(200).json({
              status: 'success',
              payload: {surveys: surveys.reverse(), count: surveys.length > 0 ? surveysCount[0].count : ''} })
          })
          .catch(err => {
            return res.status(500).json({status: 'failed', payload: err})
          })
      })
      .catch(err => {
        return res.status(500).json({status: 'failed', payload: err})
      })
  }
}

exports.allSurveys = function (req, res) {
  dataLayer.allSurvey()
    .then(surveys => {
      return res.status(200).json({
        status: 'success',
        payload: surveys
      })
    })
    .catch(err => {
      return res.status(500).json({status: 'failed', payload: err})
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
      res.status(201).json({status: 'success', payload: pollCreated})
    })
    .catch(err => {
      return res.status(500).json({status: `failed ${err}`, payload: 'failed to saved polls'})
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
      return res.status(201).json({status: 'success', payload: survey})
    })
    .catch(err => {
      return res.status(500).json({status: `failed ${err}`, payload: err})
    })
}

exports.allCategories = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      dataLayer.CategoryFind(companyUser)
        .then(categories => {
          res.status(200).json({
            status: 'success',
            payload: categories
          })
        })
        .catch(err => {
          return res.status(500).json({status: 'failed', payload: err})
        })
    })
    .catch(err => {
      return res.status(500).json({status: 'failed', payload: err})
    })
}

exports.createCategory = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      let categoryPayload = logicLayer.createDataCategory({req, companyUser})
      if (req.user.isSuperUser) {
        categoryPayload.createdBySuperUser = true
      }
      dataLayer.createCategory(categoryPayload)
        .then(categoryCreated => {
          res.status(201).json({
            status: 'success',
            payload: categoryCreated
          })
        })
        .catch(err => {
          return res.status(500).json({status: `failed ${err}`, payload: 'failed due to save category'})
        })
    })
    .catch(err => {
      return res.status(500).json({status: `failed ${err}`, payload: 'failed due to fetch user'})
    })
}

exports.editCategory = function (req, res) {
  let payload = {
    name: req.body.name
  }
  dataLayer.editCategory({_id: req.body._id}, payload)
    .then(categoryCreated => {
      res.status(201).json({
        status: 'success',
        payload: categoryCreated
      })
    })
    .catch(err => {
      return res.status(500).json({status: `failed ${err}`, payload: err})
    })
}

exports.surveyDetails = function (req, res) {
  dataLayer.findSurveyById(req)
    .then(survey => {
      if (!survey) {
        return res.status(404).json({
          status: 'failed',
          description: `survey not found.`
        })
      }
      dataLayer.findQuestionById(req)
        .then(questions => {
          return res.status(200).json({status: 'success', payload: {survey, questions}})
        })
        .catch(err => {
          return res.status(500).json({status: `failed ${err}`, payload: 'failed due to question'})
        })
    })
    .catch(err => {
      return res.status(500).json({status: `failed ${err}`, payload: 'failed due to findsurvey'})
    })
}
exports.pollDetails = function (req, res) {
  dataLayer.findPollById(req.params.pollid)
    .then(poll => {
      if (!poll) {
        return res.status(404).json({
          status: 'failed',
          description: `survey not found.`
        })
      }
      return res.status(200).json({status: 'success', payload: poll})
    })
    .catch(err => {
      return res.status(500).json({status: 'failed', payload: err})
    })
}

exports.deletePoll = function (req, res) {
  dataLayer.FindByIdPoll(req)
    .then(poll => {
      if (!poll) {
        return res.status(404)
          .json({status: 'failed', description: 'Record not found'})
      }
      dataLayer.removePoll(req.params.id)
        .then(success => {
          return res.status(500).json({status: 'success'})
        })
        .catch(err => {
          return res.status(500)
            .json({status: `failed ${err}`, description: 'Internal Server Error'})
        })
    })
    .catch(err => {
      return res.status(500)
        .json({status: `failed ${err}`, description: 'Internal Server Error'})
    })
}

exports.deleteCategory = function (req, res) {
  dataLayer.pollCategoryById(req)
    .then(category => {
      if (!category) {
        return res.status(404)
          .json({status: 'failed', description: 'Record not found'})
      }
      dataLayer.removeCategory(req.params.id)
        .then(success => {
          return res.status(500).json({status: 'success'})
        })
        .catch(error => {
          return res.status(500)
            .json({status: `failed ${error}`, description: 'error in remove category'})
        })
    })
    .catch(error => {
      return res.status(500)
        .json({status: `failed ${error}`, description: 'error in pollCategoryById'})
    })
}

exports.deleteSurvey = function (req, res) {
  dataLayer.surveyFindId(req)
    .then(survey => {
      if (!survey) {
        return res.status(404)
          .json({status: 'failed', description: 'Record not found'})
      }
      dataLayer.removeSurvey(req.params.id)
        .then(success => {
          return res.status(500).json({status: 'success'})
        })
    })
    .catch(err => {
      return res.status(500)
        .json({status: 'failed', description: err})
    })
}

exports.editSurvey = function (req, res) {
  dataLayer.surveyId(req)
    .then(survey => {
      if (!survey) {
        return res.status(404)
          .json({status: 'failed', description: 'Record not found'})
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
                    return res.status(500).json({status: `failed ${err}`, payload: 'remove question'})
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
                    return res.status(500).json({status: `failed ${err}`, payload: 'save question'})
                  })
              }
              return res.status(201).json({status: 'success', payload: survey})
            })
            .catch(err => {
              return res.status(500).json({status: `failed ${err}`, payload: 'find question'})
            })
        })
        .catch(err => {
          return res.status(500).json({status: `failed ${err}`, payload: err})
        })
    })
    .catch(err => {
      return res.status(500).json({status: `failed ${err}`, payload: err})
    })
}

exports.editPoll = function (req, res) {
  dataLayer.findPollById(req.body._id)
    .then(poll => {
      if (!poll) {
        return res.status(404)
          .json({status: 'failed', description: 'Record not found'})
      }
      let payload = {
        title: req.body.title,
        statement: req.body.statement,
        options: req.body.options,
        category: req.body.category
      }
      dataLayer.editPoll({_id: req.body._id}, payload)
        .then(success => {
          res.status(201).json({
            status: 'success',
            payload: poll
          })
        })
        .catch(err => {
          return res.status(500).json({status: `failed ${err}`, payload: err})
        })
    })
    .catch(err => {
      return res.status(500).json({status: `failed ${err}`, payload: err})
    })
}

exports.createBroadcast = function (req, res) {
  callApi.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email, populate: 'companyId' }, req.headers.authorization)
    .then(companyUser => {
      callApi.callApi(`featureUsage/planQuery`, 'post', {planId: companyUser.companyId.planId}, req.headers.authorization)
        .then(planUsage => {
          planUsage = planUsage[0]
          callApi.callApi(`featureUsage/companyQuery`, 'post', {companyId: companyUser.companyId._id}, req.headers.authorization)
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
                    callApi.callApi('featureUsage/updateCompany', 'put', {query: {companyId: companyUser.companyId._id}, newPayload: { $inc: { broadcast_templates: 1 } }, options: {}}, req.headers.authorization)
                      .then(update => {
                      })
                      .catch(err => {
                        return res.status(500).json({status: `failed ${err}`, payload: 'failed due to update company'})
                      })
                  }
                  res.status(201).json({status: 'success', payload: broadcastCreated})
                })
                .catch(err => {
                  return res.status(500).json({status: `failed ${err}`, description: 'Failed to insert record'})
                })
            })
            .catch(err => {
              return res.status(500).json({status: `failed ${err}`, payload: err})
            })
        })
        .catch(err => {
          return res.status(500).json({status: `failed ${err}`, payload: err})
        })
    })
    .catch(err => {
      return res.status(500).json({status: `failed ${err}`, payload: err})
    })
}

exports.allBroadcasts = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      dataLayer.broadcastFind(companyUser)
        .then(broadcasts => {
          res.status(200).json({
            status: 'success',
            payload: broadcasts
          })
        })
        .catch(err => {
          return res.status(500).json({status: 'failed', payload: err})
        })
    })
    .catch(err => {
      return res.status(500).json({status: 'failed', payload: err})
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
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      if (req.body.first_page === 'first') {
        let findCriteria = logicLayer.getCriteriasBroadcast({req, companyUser})
        dataLayer.broadcastTemplateaggregateCount(findCriteria)
          .then(broadcastsCount => {
            dataLayer.broadcastTemplateaggregateLimit({findCriteria, req})
              .then(broadcasts => {
                res.status(200).json({
                  status: 'success',
                  payload: {broadcasts: broadcasts, count: broadcasts.length > 0 ? broadcastsCount[0].count : ''}
                })
              })
              .catch(err => {
                return res.status(500).json({status: 'failed', payload: err})
              })
          })
          .catch(err => {
            return res.status(500).json({status: 'failed', payload: err})
          })
      } else if (req.body.first_page === 'next') {
        let recordsToSkip = Math.abs(((req.body.requested_page - 1) - (req.body.current_page))) * req.body.number_of_records
        let findCriteria = logicLayer.getCriteriasBroadcast({req, companyUser})
        dataLayer.broadcastTemplateaggregateCount(findCriteria)
          .then(broadcastsCount => {
            dataLayer.broadcastTemplateaggregateLimitNextPrevious({findCriteria, recordsToSkip, req})
              .then(broadcasts => {
                res.status(200).json({
                  status: 'success',
                  payload: {broadcasts: broadcasts, count: broadcasts.length > 0 ? broadcastsCount[0].count : ''}
                })
              })
              .catch(err => {
                return res.status(500).json({status: 'failed', payload: err})
              })
          })
          .catch(err => {
            return res.status(500).json({status: 'failed', payload: err})
          })
      } else if (req.body.first_page === 'previous') {
        let recordsToSkip = Math.abs(((req.body.requested_page) - (req.body.current_page - 1))) * req.body.number_of_records
        let findCriteria = logicLayer.getCriteriasBroadcast({req, companyUser})
        dataLayer.broadcastTemplateaggregateCount(findCriteria)
          .then(broadcastsCount => {
            dataLayer.broadcastTemplateaggregateLimitNextPrevious({findCriteria, recordsToSkip, req})
              .then(broadcasts => {
                res.status(200).json({
                  status: 'success',
                  payload: {broadcasts: broadcasts, count: broadcasts.length > 0 ? broadcastsCount[0].count : ''}
                })
              })
              .catch(err => {
                return res.status(500).json({status: 'failed', payload: err})
              })
          })
          .catch(err => {
            return res.status(500).json({status: 'failed', payload: err})
          })
      }
    })
}

exports.deleteBroadcast = function (req, res) {
  dataLayer.BroadcastFindById(req)
    .then(broadcast => {
      if (!broadcast) {
        return res.status(404)
          .json({status: 'failed', description: 'Record not found'})
      }
      dataLayer.removeBroadcast(broadcast)
        .then(success => {
          return res.status(500).json({status: 'success'})
        })
        .catch(error => {
          return res.status(500)
            .json({status: `failed ${error}`, description: 'Internal Server Error'})
        })
    })
    .catch(error => {
      return res.status(500)
        .json({status: `failed ${error}`, description: 'Internal Server Error'})
    })
}

exports.editBroadcast = function (req, res) {
  dataLayer.broadcastFindbyId(req)
    .then(broadcast => {
      if (!broadcast) {
        return res.status(404)
          .json({status: 'failed', description: 'Record not found'})
      }
      let payload = {
        title: req.body.title,
        payload: req.body.payload,
        category: req.body.category
      }
      dataLayer.saveBroadcast({_id: req.body._id}, payload)
        .then(success => {
          res.status(201).json({status: 'success', payload: broadcast})
        })
    })
    .catch(error => {
      return res.status(500)
        .json({status: 'failed', description: error})
    })
}

exports.broadcastDetails = function (req, res) {
  dataLayer.findBroadcastById(req)
    .then(broadcast => {
      if (!broadcast) {
        return res.status(404).json({
          status: 'failed',
          description: `broadcast not found.`
        })
      }
      return res.status(200).json({status: 'success', payload: broadcast})
    })
    .catch(err => {
      return res.status(500).json({status: 'failed', payload: err})
    })
}

exports.createBotTemplate = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      let botTemplatePayload = logicLayer.createDataBots(req)
      if (req.user.isSuperUser) {
        botTemplatePayload.createdBySuperUser = true
      }
      dataLayer.createBot(botTemplatePayload)
        .then(botTemplateCreated => {
          res.status(200).json({
            status: 'success',
            payload: botTemplateCreated
          })
        })
        .catch(err => {
          return res.status(500).json({status: 'failed', payload: err})
        })
    })
    .catch(err => {
      return res.status(500).json({status: 'failed', payload: err})
    })
}

exports.allBots = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      dataLayer.botFind(companyUser)
        .then(bots => {
          res.status(200).json({
            status: 'success',
            payload: bots
          })
        })
        .catch(err => {
          return res.status(500).json({status: 'failed', payload: err})
        })
    })
    .catch(err => {
      return res.status(500).json({status: 'failed', payload: err})
    })
}

exports.deleteBot = function (req, res) {
  dataLayer.BotFindById(req)
    .then(botFound => {
      if (!botFound) {
        return res.status(404)
          .json({status: 'failed', description: 'Record not found'})
      }
      dataLayer.removeBot(req.body._id)
        .then(success => {
          return res.status(500).json({status: 'success'})
        })
    })
    .catch(err => {
      return res.status(500)
        .json({status: 'failed', description: err})
    })
}

exports.editBot = function (req, res) {
  dataLayer.BotFindById(req)
    .then(botTemplateFound => {
      if (!botTemplateFound) {
        return res.status(404)
          .json({status: 'failed', description: 'Record not found'})
      }
      let payload = {
        title: req.body.title,
        payload: req.body.payload,
        category: req.body.category
      }
      dataLayer.botSave({_id: req.body._id}, payload)
        .then(success => {
          res.status(201).json({
            status: 'success',
            payload: botTemplateFound
          })
        })
        .catch(err => {
          return res.status(500).json({status: 'failed', payload: err})
        })
    })
    .catch(err => {
      return res.status(500).json({status: 'failed', payload: err})
    })
}

exports.botDetails = function (req, res) {
  dataLayer.findBotById(req)
    .then(bot => {
      if (!bot) {
        return res.status(404).json({
          status: 'failed',
          description: `Bot not found.`
        })
      }
      return res.status(200).json({status: 'success', payload: bot})
    })
    .catch(err => {
      return res.status(500).json({status: 'failed', payload: err})
    })
}

// todo temporary bot template for DNC, will be data driven
exports.getPoliticsBotTemplate = function (req, res) {
  let payload = logicLayer.getPoliticsBotTemplate()
  return res.status(200).json({status: 'success', payload: payload})
}
