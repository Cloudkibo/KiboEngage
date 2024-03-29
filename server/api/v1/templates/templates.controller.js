const TemplatePolls = require('./pollTemplate.model')
const TemplateBroadcasts = require('./broadcastTemplate.model')
const SurveyQuestions = require('./surveyQuestion.model')
const TemplateSurveys = require('./surveyTemplate.model')
const Category = require('./category.model')
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
    dataLayer.pollTemplateaggregateCount([
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ])
      .then(pollsCount => {
        dataLayer.pollTemplateaggregateLimit({findCriteria, req})
          .then(polls => {
            res.status(200).json({
              status: 'success',
              payload: {polls: polls, count: polls.length > 0 ? pollsCount[0].count : ''}
            })
          })
          .catch(err => {
            return res.status(500).json({status: `failed ${err}`, payload: ` ${JSON.stringify(error)}`})
          })
      })
      .catch(err => {
        return res.status(500).json({status: `failed ${err}`, payload: ` ${JSON.stringify(error)}`})
      })
  } else if (req.body.first_page === 'next') {
    let recordsToSkip = Math.abs(((req.body.requested_page - 1) - (req.body.current_page))) * req.body.number_of_records
    let findCriteria = logicLayer.getCriterias(req)
    dataLayer.pollTemplateaggregateCount([
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ])
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
    dataLayer.pollTemplateaggregateCount([
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ])
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
    dataLayer.surveyTemplateaggregateCount([
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ])
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
    dataLayer.surveyTemplateaggregateCount([
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ])
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
    dataLayer.surveyTemplateaggregateCount([
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ])
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
  const poll = new TemplatePolls(pollPayload)

  // save model to MongoDB
  dataLayer.savePolls(poll)
    .then(pollCreated => {
      res.status(201).json({status: 'success', payload: pollCreated})
    }
    )
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
  const survey = new TemplateSurveys(surveyPayload)
  dataLayer.createSurveys(survey)
    .then(survey => {
      // after survey is created, create survey questions
      for (let question in req.body.questions) {
        let options = []
        options = req.body.questions[question].options
        const surveyQuestion = new SurveyQuestions({
          statement: req.body.questions[question].statement, // question statement
          options, // array of question options
          surveyId: survey._id
        })
        QuestionsurveydataLayer.createQuestionSurveys(surveyQuestion)
          .then(question1 => {
          })
          .catch(err => {
            return res.status(500).json({status: `failed ${err}`, payload: err})
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
      const category = new Category(categoryPayload)
      dataLayer.CategorySave(category)
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
  dataLayer.findCategroryById(req)
    .then(category => {
      if (!category) {
        return res.status(404)
          .json({status: 'failed', description: 'Record not found'})
      }
      category.name = req.body.name
      dataLayer.CategorySave(category)
        .then(categoryCreated => {
          res.status(201).json({
            status: 'success',
            payload: categoryCreated
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
  dataLayer.findPollById(req)
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
      dataLayer.removePoll(poll)
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
      dataLayer.removeCategory(category)
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
      dataLayer.removeSurvey(survey)
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
      survey.title = req.body.survey.title
      survey.description = req.body.survey.description
      survey.category = req.body.survey.category
      dataLayer.saveSurveys(survey)
        .then(success => {
          dataLayer.findQuestionSurveyById(req)
            .then(questions => {
              for (let i = 0; i < questions.length; i++) {
                dataLayer.removeQuestion(questions[i])
                  .then(success => {})
                  .catch(err => {
                    return res.status(500).json({status: `failed ${err}`, payload: 'remove question'})
                  })
              }
              for (let question in req.body.questions) {
                let options = []
                options = req.body.questions[question].options
                const surveyQuestion = new SurveyQuestions({
                  statement: req.body.questions[question].statement, // question statement
                  options, // array of question options
                  surveyId: survey._id
                })
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
  dataLayer.pollFindById(req)
    .then(poll => {
      if (!poll) {
        return res.status(404)
          .json({status: 'failed', description: 'Record not found'})
      }
      poll.title = req.body.title
      poll.statement = req.body.statement
      poll.options = req.body.options
      poll.category = req.body.category
      dataLayer.savePolls(poll)
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
  callApi.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      callApi.callApi(`companyprofile/query`, 'post', {ownerId: req.user._id}, req.headers.authorization)
        .then(companyProfile => {
          callApi.callApi(`featureUsage/planQuery`, 'post', {planId: companyProfile.planId}, req.headers.authorization)
            .then(planUsage => {
              planUsage = planUsage[0]
              callApi.callApi(`featureUsage/companyQuery`, 'post', {companyId: companyProfile._id}, req.headers.authorization)
                .then(companyUsage => {
                  companyUsage = companyUsage[0]
                  if (planUsage.polls !== -1 && companyUsage.polls >= planUsage.polls) {
                    return res.status(500).json({
                      status: 'failed',
                      description: `Your polls limit has reached. Please upgrade your plan to premium in order to create more polls`
                    })
                  }
                  let broadcastPayload = logicLayer.createDataBroadcast(req, companyUser)
                  if (req.user.isSuperUser) {
                    broadcastPayload.createdBySuperUser = true
                  }
                  const broadcast = new TemplateBroadcasts(broadcastPayload)
                  dataLayer.saveBroadcast(broadcast)
                    .then(broadcastCreated => {
                      if (!req.user.isSuperUser) {
                        callApi.callApi('featureUsage/updateCompany', 'put', {query: {companyId: companyUser.companyId}, newPayload: { $inc: { broadcast_templates: 1 } }, options: {}}, req.headers.authorization)
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

exports.getAllPolls = function (req, res) {
  if (req.body.first_page === 'first') {
    let findCriteria = logicLayer.getCriterias(req)
    dataLayer.pollTemplateaggregateCount([
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ])
      .then(pollsCount => {
        dataLayer.pollTemplateaggregateLimit({findCriteria, req})
          .then(polls => {
            res.status(200).json({
              status: 'success',
              payload: {polls: polls, count: polls.length > 0 ? pollsCount[0].count : ''}
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
    dataLayer.pollTemplateaggregateCount([
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ])
      .then(pollsCount => {
        dataLayer.pollTemplateaggregateLimitNextPrevious({findCriteria, recordsToSkip, req})
          .then(polls => {
            res.status(200).json({
              status: 'success',
              payload: {polls: polls, count: polls.length > 0 ? pollsCount[0].count : ''}
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
    let findCriteria = logicLayer.getCriterias(req)
    dataLayer.pollTemplateaggregateCount([
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ])
      .then(pollsCount => {
        dataLayer.pollTemplateaggregateLimitNextPrevious({findCriteria, recordsToSkip, req})
          .then(polls => {
            res.status(200).json({
              status: 'success',
              payload: {polls: polls.reverse(), count: polls.length > 0 ? pollsCount[0].count : ''}
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
        dataLayer.broadcastTemplateaggregateCount([
          { $match: findCriteria },
          { $group: { _id: null, count: { $sum: 1 } } }
        ])
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
        let findCriteria = logicLayer.getCriteriasBroadcast(req)
        dataLayer.broadcastTemplateaggregateCount([
          { $match: findCriteria },
          { $group: { _id: null, count: { $sum: 1 } } }
        ])
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
        let findCriteria = logicLayer.getCriteriasBroadcast(req)
        dataLayer.broadcastTemplateaggregateCount([
          { $match: findCriteria },
          { $group: { _id: null, count: { $sum: 1 } } }
        ])
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
      broadcast.title = req.body.title
      broadcast.payload = req.body.payload
      broadcast.category = req.body.category
      dataLayer.saveBroadcast(broadcast)
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
      dataLayer.botSave(botTemplatePayload)
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
      dataLayer.removeBot(botFound)
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
      botTemplateFound.title = req.body.title
      botTemplateFound.payload = req.body.payload
      botTemplateFound.category = req.body.category
      dataLayer.botSave(botTemplateFound)
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
