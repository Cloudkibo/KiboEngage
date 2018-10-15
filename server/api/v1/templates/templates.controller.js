const logger = require('../../../components/logger')
const TemplatePolls = require('./pollTemplate.model')
const TemplateSurveys = require('./surveyTemplate.model')
const TemplateBroadcasts = require('./broadcastTemplate.model')
const TemplateBots = require('./bots_template.model')
const SurveyQuestions = require('./surveyQuestion.model')
const Category = require('./category.model')
const CompanyUsers = require('./../companyuser/companyuser.model')
const mongoose = require('mongoose')
const CompanyUsage = require('./../featureUsage/companyUsage.model')
const PlanUsage = require('./../featureUsage/planUsage.model')
const CompanyProfile = require('./../companyprofile/companyprofile.model')
const TAG = 'api/templates/templates.controller.js'
const dataLayer = require('./template.datalayer')
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
          payload: {surveys: surveys, count: surveys.length > 0 ? surveysCount[0].count : ''}        })
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
          payload: {surveys: surveys.reverse(), count: surveys.length > 0 ? surveysCount[0].count : ''}        })
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
        callApi.callApi('permissions_plan/query', 'post', {planId: companyProfile.planId})
        .then(planUsage => {
          callApi.callApi('featureUsage/query', 'post', {companyId: companyUser.companyId})
          .then(companyUsage => {

            if (planUsage.polls_templates !== -1 && companyUsage.polls_templates >= planUsage.polls_templates) {
              return res.status(500).json({
                status: 'failed',
                description: `Your templates limit has reached. Please upgrade your plan to premium in order to create more templates`
              })
            }
            let pollPayload = logicLayer.createDataPolls(req)
            const poll = new TemplatePolls(pollPayload)
            dataLayer.savePolls(poll)
            .then(pollCreated => {
              if (!req.user.isSuperUser) {
                callApi.callApi('featureUsage/update', 'post', {companyId: companyUser.companyId})
                .then(update => {
                  res.status(201).json({status: 'success', payload: pollCreated})
                })
                .catch(err => {
                  return res.status(500).json({status: 'failed', payload: err})
                })
              }            
            })
            .catch(err => {
              return res.status(500).json({status: 'failed', description: 'Failed to insert record'})
            })
          })
          .catch(err => {
            return res.status(500).json({status: 'failed', payload: err})
          })
        })
        .catch(err => {
          return res.status(500).json({status: 'failed', payload: err})
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

exports.createSurvey = function (req, res) {
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
        callApi.callApi('permissions_plan/query', 'post', {planId: companyProfile.planId})
        .then(planUsage => {
          callApi.callApi('featureUsage/query', 'post', {companyId: companyUser.companyId})
          .then(companyUsage => {

            if (planUsage.survey_templates !== -1 && companyUsage.survey_templates >= planUsage.survey_templates) {
              return res.status(500).json({
                status: 'failed',
                description: `Your templates limit has reached. Please upgrade your plan to premium in order to create more templates`
              })
            }
            let surveyPayload = logicLayer.createDataSurvey(req)
            const survey = new TemplatePolls(surveyPayload)
            dataLayer.createSurveys(survey)
            .then(surveyCreated => {
              if (!req.user.isSuperUser) {
                dataLayer.companyUsageUpdate(companyUser)
                .then(update => {
                  
                })
                .catch(err => {
                  return res.status(500).json({status: 'failed', payload: err})
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
                dataLayer.saveSurveys(surveyQuestion)
                .then(survey => {
                })
                .catch(err => {
                  return res.status(500).json({status: 'failed', payload: err})
                })
              }        
              return res.status(201).json({status: 'success', payload: survey})                 
            })
            .catch(err => {
              return res.status(500).json({status: 'failed', description: 'Failed to insert record'})
            })
          })
          .catch(err => {
            return res.status(500).json({status: 'failed', payload: err})
          })
        })
        .catch(err => {
          return res.status(500).json({status: 'failed', payload: err})
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
      return res.status(500).json({status: 'failed', payload: err})
    })
  })
  .catch(err => {
    return res.status(500).json({status: 'failed', payload: err})
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
        return res.status(500).json({status: 'failed', payload: err})
      })
    })
    .catch(err => {
      return res.status(500).json({status: 'failed', payload: err})
    })
}

exports.surveyDetails = function (req, res) {
  dataLayer.findSurveyById(req)
   .then(survey => {
     dataLayer.findQuestionById(req)
    .then(questions => {
      return res.status(200).json({status: 'success', payload: {survey, questions}})
    })
    .catch(err => {
      return res.status(500).json({status: 'failed', payload: err})
    })
   })
   .catch(err => {
     return res.status(500).json({status: 'failed', payload: err})
   })
}
exports.pollDetails = function (req, res) {
  TemplatePolls.findOne({_id: req.params.pollid}, (err, poll) => {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error${JSON.stringify(err)}`
      })
    }
    if (!poll) {
      return res.status(404).json({
        status: 'failed',
        description: `Poll not found.`
      })
    }
    return res.status(200)
    .json({status: 'success', payload: poll})
  })
}

exports.deletePoll = function (req, res) {
  TemplatePolls.findById(req.params.id, (err, poll) => {
    if (err) {
      return res.status(500)
        .json({status: 'failed', description: 'Internal Server Error'})
    }
    if (!poll) {
      return res.status(404)
        .json({status: 'failed', description: 'Record not found'})
    }
    poll.remove((err2) => {
      if (err2) {
        return res.status(500)
          .json({status: 'failed', description: 'poll update failed'})
      }
      return res.status(200)
      .json({status: 'success'})
    })
  })
}

exports.deleteCategory = function (req, res) {
  Category.findById(req.params.id, (err, category) => {
    if (err) {
      return res.status(500)
        .json({status: 'failed', description: 'Internal Server Error'})
    }
    if (!category) {
      return res.status(404)
        .json({status: 'failed', description: 'Record not found'})
    }
    category.remove((err2) => {
      if (err2) {
        return res.status(500)
          .json({status: 'failed', description: 'category update failed'})
      }
      return res.status(200)
      .json({status: 'success'})
    })
  })
}

exports.deleteSurvey = function (req, res) {
  TemplateSurveys.findById(req.params.id, (err, survey) => {
    if (err) {
      return res.status(500)
        .json({status: 'failed', description: 'Internal Server Error'})
    }
    if (!survey) {
      return res.status(404)
        .json({status: 'failed', description: 'Record not found'})
    }
    survey.remove((err2) => {
      if (err2) {
        return res.status(500)
          .json({status: 'failed', description: 'survey update failed'})
      }
      return res.status(200)
      .json({status: 'success'})
    })
  })
}

exports.editSurvey = function (req, res) {
  TemplateSurveys.findById(req.body.survey._id, (err, survey) => {
    if (err) {
      return res.status(500)
        .json({status: 'failed', description: 'Internal Server Error'})
    }
    if (!survey) {
      return res.status(404)
        .json({status: 'failed', description: 'Record not found'})
    }
      // after survey is created, create survey questions
    survey.title = req.body.survey.title
    survey.description = req.body.survey.description
    survey.category = req.body.survey.category
    survey.save((err2) => {
      if (err2) {
        return res.status(500)
          .json({status: 'failed', description: 'Poll update failed'})
      }
      SurveyQuestions.find({surveyId: req.body.survey._id}, (err2, questions) => {
        if (err2) {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error ${JSON.stringify(err2)}`
          })
        }
        for (let i = 0; i < questions.length; i++) {
          questions[i].remove((err2) => {
            if (err2) {
              return res.status(500)
                .json({status: 'failed', description: 'survey update failed'})
            }
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

          surveyQuestion.save((err2, question1) => {
            if (err2) {
              return res.status(404).json({ status: 'failed', description: 'Survey Question not created' })
            }
          })
        }
        return res.status(201).json({status: 'success', payload: survey})
      })
    })
  })
}

exports.editPoll = function (req, res) {
  TemplatePolls.findById(req.body._id, (err, poll) => {
    if (err) {
      return res.status(500)
        .json({status: 'failed', description: 'Internal Server Error'})
    }
    if (!poll) {
      return res.status(404)
        .json({status: 'failed', description: 'Record not found'})
    }
    poll.title = req.body.title
    poll.statement = req.body.statement
    poll.options = req.body.options
    poll.category = req.body.category
    poll.save((err2) => {
      if (err2) {
        return res.status(500)
          .json({status: 'failed', description: 'Poll update failed'})
      }
      res.status(201).json({status: 'success', payload: poll})
    })
  })
}

exports.createBroadcast = function (req, res) {
  CompanyUsers.findOne({domain_email: req.user.domain_email}, (err, companyUser) => {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    }
    if (!companyUser) {
      return res.status(404).json({
        status: 'failed',
        description: 'The user account does not belong to any company. Please contact support'
      })
    }
    CompanyProfile.findOne({ownerId: req.user._id}, (err, companyProfile) => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
      PlanUsage.findOne({planId: companyProfile.planId}, (err, planUsage) => {
        if (err) {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error ${JSON.stringify(err)}`
          })
        }
        CompanyUsage.findOne({companyId: companyUser.companyId}, (err, companyUsage) => {
          if (err) {
            return res.status(500).json({
              status: 'failed',
              description: `Internal Server Error ${JSON.stringify(err)}`
            })
          }
          if (planUsage.broadcast_templates !== -1 && companyUsage.broadcast_templates >= planUsage.broadcast_templates) {
            return res.status(500).json({
              status: 'failed',
              description: `Your templates limit has reached. Please upgrade your plan to premium in order to create more templates`
            })
          }
          let broadcastPayload = {
            title: req.body.title,
            category: req.body.category,
            payload: req.body.payload,
            userId: req.user._id,
            companyId: companyUser.companyId
          }
          if (req.user.isSuperUser) {
            broadcastPayload.createdBySuperUser = true
          }
          const broadcast = new TemplateBroadcasts(broadcastPayload)

          // save model to MongoDB
          broadcast.save((err, broadcastCreated) => {
            if (err) {
              res.status(500).json({
                status: 'Failed',
                description: 'Failed to insert record'
              })
            } else {
              if (!req.user.isSuperUser) {
                CompanyUsage.update({companyId: companyUser.companyId},
                  { $inc: { broadcast_templates: 1 } }, (err, updated) => {
                    if (err) {
                      logger.serverLog(TAG, `ERROR ${JSON.stringify(err)}`)
                    }
                  })
              }
              res.status(201).json({status: 'success', payload: broadcastCreated})
            }
          })
        })
      })
    })
  })
}

exports.allBroadcasts = function (req, res) {
  CompanyUsers.findOne({domain_email: req.user.domain_email}, (err, companyUser) => {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    }
    if (!companyUser) {
      return res.status(404).json({
        status: 'failed',
        description: 'The user account does not belong to any company. Please contact support'
      })
    }
    TemplateBroadcasts.find({'$or': [{
      companyId: companyUser.companyId}, {createdBySuperUser: true}]
    }, (err, broadcasts) => {
      if (err) {
        logger.serverLog(TAG, `Error: ${err}`)
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error${JSON.stringify(err)}`
        })
      }
      res.status(200).json({
        status: 'success',
        payload: broadcasts
      })
    })
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
  CompanyUsers.findOne({domain_email: req.user.domain_email}, (err, companyUser) => {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    }
    if (!companyUser) {
      return res.status(404).json({
        status: 'failed',
        description: 'The user account does not belong to any company. Please contact support'
      })
    }
    if (req.body.first_page === 'first') {
      let search = new RegExp('.*' + req.body.filter_criteria.search_value + '.*', 'i')
      let findCriteria = {
        '$or': [{companyId: companyUser.companyId}, {createdBySuperUser: true}],
        title: req.body.filter_criteria.search_value !== '' ? {$regex: search} : {$exists: true},
        category: req.body.filter_criteria.category_value !== '' ? req.body.filter_criteria.category_value : {$exists: true}
      }
      TemplateBroadcasts.aggregate([
        { $match: findCriteria },
        { $group: { _id: null, count: { $sum: 1 } } }
      ], (err, broadcastsCount) => {
        if (err) {
          return res.status(404)
            .json({status: 'failed', description: 'BroadcastsCount not found'})
        }
        TemplateBroadcasts.aggregate([{$match: findCriteria}, {$sort: {datetime: -1}}]).limit(req.body.number_of_records)
        .exec((err, broadcasts) => {
          if (err) {
            logger.serverLog(TAG, `Error: ${err}`)
            return res.status(500).json({
              status: 'failed',
              description: `Internal Server Error${JSON.stringify(err)}`
            })
          }
          res.status(200).json({
            status: 'success',
            payload: {broadcasts: broadcasts, count: broadcasts.length > 0 ? broadcastsCount[0].count : ''}
          })
        })
      })
    } else if (req.body.first_page === 'next') {
      let recordsToSkip = Math.abs(((req.body.requested_page - 1) - (req.body.current_page))) * req.body.number_of_records
      let search = new RegExp('.*' + req.body.filter_criteria.search_value + '.*', 'i')
      let findCriteria = {
        '$or': [{companyId: companyUser.companyId}, {createdBySuperUser: true}],
        title: req.body.filter_criteria.search_value !== '' ? {$regex: search} : {$exists: true},
        category: req.body.filter_criteria.category_value !== '' ? req.body.filter_criteria.category_value : {$exists: true}
      }
      TemplateBroadcasts.aggregate([
        { $match: findCriteria },
        { $group: { _id: null, count: { $sum: 1 } } }
      ], (err, broadcastsCount) => {
        if (err) {
          return res.status(404)
            .json({status: 'failed', description: 'BroadcastsCount not found'})
        }
        TemplateBroadcasts.aggregate([{$match: {$and: [findCriteria, {_id: {$lt: mongoose.Types.ObjectId(req.body.last_id)}}]}}, {$sort: {datetime: -1}}]).skip(recordsToSkip).limit(req.body.number_of_records)
        .exec((err, broadcasts) => {
          if (err) {
            logger.serverLog(TAG, `Error: ${err}`)
            return res.status(500).json({
              status: 'failed',
              description: `Internal Server Error${JSON.stringify(err)}`
            })
          }
          res.status(200).json({
            status: 'success',
            payload: {broadcasts: broadcasts, count: broadcasts.length > 0 ? broadcastsCount[0].count : ''}
          })
        })
      })
    } else if (req.body.first_page === 'previous') {
      let recordsToSkip = Math.abs(((req.body.requested_page) - (req.body.current_page - 1))) * req.body.number_of_records
      let search = new RegExp('.*' + req.body.filter_criteria.search_value + '.*', 'i')
      let findCriteria = {
        '$or': [{companyId: companyUser.companyId}, {createdBySuperUser: true}],
        title: req.body.filter_criteria.search_value !== '' ? {$regex: search} : {$exists: true},
        category: req.body.filter_criteria.category_value !== '' ? req.body.filter_criteria.category_value : {$exists: true}
      }
      TemplateBroadcasts.aggregate([
        { $match: findCriteria },
        { $group: { _id: null, count: { $sum: 1 } } }
      ], (err, broadcastsCount) => {
        if (err) {
          return res.status(404)
            .json({status: 'failed', description: 'BroadcastsCount not found'})
        }
        TemplateBroadcasts.aggregate([{$match: {$and: [findCriteria, {_id: {$gt: mongoose.Types.ObjectId(req.body.last_id)}}]}}, {$sort: {datetime: 1}}]).skip(recordsToSkip).limit(req.body.number_of_records)
        .exec((err, broadcasts) => {
          if (err) {
            logger.serverLog(TAG, `Error: ${err}`)
            return res.status(500).json({
              status: 'failed',
              description: `Internal Server Error${JSON.stringify(err)}`
            })
          }
          res.status(200).json({
            status: 'success',
            payload: {broadcasts: broadcasts.reverse(), count: broadcasts.length > 0 ? broadcastsCount[0].count : ''}
          })
        })
      })
    }
  })
}

exports.deleteBroadcast = function (req, res) {
  TemplateBroadcasts.findById(req.params.id, (err, broadcast) => {
    if (err) {
      return res.status(500)
        .json({status: 'failed', description: 'Internal Server Error'})
    }
    if (!broadcast) {
      return res.status(404)
        .json({status: 'failed', description: 'Record not found'})
    }
    broadcast.remove((err2) => {
      if (err2) {
        return res.status(500)
          .json({status: 'failed', description: 'poll update failed'})
      }
      return res.status(200)
      .json({status: 'success'})
    })
  })
}

exports.editBroadcast = function (req, res) {
  TemplateBroadcasts.findById(req.body._id, (err, broadcast) => {
    if (err) {
      return res.status(500)
        .json({status: 'failed', description: 'Internal Server Error'})
    }
    if (!broadcast) {
      return res.status(404)
        .json({status: 'failed', description: 'Record not found'})
    }
    broadcast.title = req.body.title
    broadcast.payload = req.body.payload
    broadcast.category = req.body.category
    broadcast.save((err2) => {
      if (err2) {
        return res.status(500)
          .json({status: 'failed', description: 'Poll update failed'})
      }
      res.status(201).json({status: 'success', payload: broadcast})
    })
  })
}

exports.broadcastDetails = function (req, res) {
  //
  TemplateBroadcasts.findOne({_id: req.params.broadcastid}, (err, broadcast) => {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error${JSON.stringify(err)}`
      })
    }
    if (!broadcast) {
      return res.status(404).json({
        status: 'failed',
        description: `Poll not found.`
      })
    }
    return res.status(200)
    .json({status: 'success', payload: broadcast})
  })
}

exports.createBotTemplate = function (req, res) {
  CompanyUsers.findOne({domain_email: req.user.domain_email}, (err, companyUser) => {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    }
    if (!companyUser) {
      return res.status(404).json({
        status: 'failed',
        description: 'The user account does not belong to any company. Please contact support'
      })
    }
    let botTemplatePayload = {
      title: req.body.title,
      category: req.body.category,
      payload: req.body.payload,
      userId: req.user._id,
      companyId: companyUser.companyId
    }
    if (req.user.isSuperUser) {
      botTemplatePayload.createdBySuperUser = true
    }
    const botPayload = new TemplateBots(botTemplatePayload)

    // save model to MongoDB
    botPayload.save((err, botTemplateCreated) => {
      if (err) {
        res.status(500).json({
          status: 'failed',
          description: 'Failed to insert record'
        })
      } else {
        res.status(201).json({status: 'success', payload: botTemplateCreated})
      }
    })
  })
}

exports.allBots = function (req, res) {
  CompanyUsers.findOne({domain_email: req.user.domain_email}, (err, companyUser) => {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    }
    if (!companyUser) {
      return res.status(404).json({
        status: 'failed',
        description: 'The user account does not belong to any company. Please contact support'
      })
    }
    TemplateBots.find({'$or': [{
      companyId: companyUser.companyId}, {createdBySuperUser: true}]
    }, (err, bots) => {
      if (err) {
        logger.serverLog(TAG, `Error: ${err}`)
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error${JSON.stringify(err)}`
        })
      }
      res.status(200).json({
        status: 'success',
        payload: bots
      })
    })
  })
}

exports.deleteBot = function (req, res) {
  TemplateBots.findById(req.params.id, (err, botFound) => {
    if (err) {
      return res.status(500)
      .json({status: 'failed', description: 'Internal Server Error'})
    }
    if (!botFound) {
      return res.status(404)
      .json({status: 'failed', description: 'Record not found'})
    }
    botFound.remove((err2) => {
      if (err2) {
        return res.status(500)
        .json({status: 'failed', description: 'Deleting bot failed'})
      }
      return res.status(200)
      .json({status: 'success'})
    })
  })
}

exports.editBot = function (req, res) {
  TemplateBots.findById(req.body._id, (err, botTemplateFound) => {
    if (err) {
      return res.status(500)
      .json({status: 'failed', description: 'Internal Server Error'})
    }
    if (!botTemplateFound) {
      return res.status(404)
      .json({status: 'failed', description: 'Record not found'})
    }
    botTemplateFound.title = req.body.title
    botTemplateFound.payload = req.body.payload
    botTemplateFound.category = req.body.category
    botTemplateFound.save((err2) => {
      if (err2) {
        return res.status(500)
        .json({status: 'failed', description: 'Bot update failed'})
      }
      res.status(201).json({status: 'success', payload: botTemplateFound})
    })
  })
}

exports.botDetails = function (req, res) {
  //
  TemplateBots.findOne({_id: req.params.botid}, (err, bot) => {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error${JSON.stringify(err)}`
      })
    }
    if (!bot) {
      return res.status(404).json({
        status: 'failed',
        description: `Bot not found.`
      })
    }
    return res.status(200)
    .json({status: 'success', payload: bot})
  })
}

// todo temporary bot template for DNC, will be data driven
exports.getPoliticsBotTemplate = function (req, res) {
  let payload = logicLayer.getPoliticsBotTemplate()
  return res.status(200).json({status: 'success', payload})
}
