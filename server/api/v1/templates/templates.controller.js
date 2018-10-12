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
    let findCriteria = logicLayer.getCriteriasPolls(req)
    dataLayer.pollTemplateaggregateCount([
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ])
    .then(pollsCount => {
      dataLayer.pollTemplateaggregateLimit(findCriteria, req)
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
    let findCriteria = logicLayer.getCriteriasPolls(req) 
    dataLayer.pollTemplateaggregateCount([
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ])
    .then(pollsCount => {
      dataLayer.pollTemplateaggregateLimitNext(findCriteria, recordsToSkip, req)
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
    let findCriteria = logicLayer.getCriteriasPolls(req) 
    dataLayer.pollTemplateaggregateCount([
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ])
    .then(pollsCount => {
      dataLayer.pollTemplateaggregateLimitNext(findCriteria, recordsToSkip, req)
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
  }
}

exports.getAllSurveys = function (req, res) {
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
  if (req.body.first_page === 'first') {
    let search = new RegExp('.*' + req.body.filter_criteria.search_value + '.*', 'i')
    let findCriteria = {
      title: req.body.filter_criteria.search_value !== '' ? {$regex: search} : {$exists: true},
      category: req.body.filter_criteria.category_value !== '' ? req.body.filter_criteria.category_value : {$exists: true}
    }
    TemplateSurveys.aggregate([
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ], (err, surveysCount) => {
      if (err) {
        return res.status(404)
          .json({status: 'failed', description: 'SurveysCount not found'})
      }
      TemplateSurveys.aggregate([{$match: findCriteria}, {$sort: {datetime: -1}}]).limit(req.body.number_of_records)
      .exec((err, surveys) => {
        if (err) {
          logger.serverLog(TAG, `Error: ${err}`)
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error${JSON.stringify(err)}`
          })
        }
        res.status(200).json({
          status: 'success',
          payload: {surveys: surveys, count: surveys.length > 0 ? surveysCount.length > 0 ? surveysCount[0].count : 0 : 0}
        })
      })
    })
  } else if (req.body.first_page === 'next') {
    let recordsToSkip = Math.abs(((req.body.requested_page - 1) - (req.body.current_page))) * req.body.number_of_records
    let search = new RegExp('.*' + req.body.filter_criteria.search_value + '.*', 'i')
    let findCriteria = {
      title: req.body.filter_criteria.search_value !== '' ? {$regex: search} : {$exists: true},
      category: req.body.filter_criteria.category_value !== '' ? req.body.filter_criteria.category_value : {$exists: true}
    }
    TemplateSurveys.aggregate([
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ], (err, surveysCount) => {
      if (err) {
        return res.status(404)
          .json({status: 'failed', description: 'PollsCount not found'})
      }
      TemplateSurveys.aggregate([{$match: {$and: [findCriteria, {_id: {$lt: mongoose.Types.ObjectId(req.body.last_id)}}]}}, {$sort: {datetime: -1}}]).skip(recordsToSkip).limit(req.body.number_of_records)
      .exec((err, surveys) => {
        if (err) {
          logger.serverLog(TAG, `Error: ${err}`)
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error${JSON.stringify(err)}`
          })
        }
        res.status(200).json({
          status: 'success',
          payload: {surveys: surveys, count: surveys.length > 0 ? surveysCount[0].count : ''}
        })
      })
    })
  } else if (req.body.first_page === 'previous') {
    let recordsToSkip = Math.abs(((req.body.requested_page) - (req.body.current_page - 1))) * req.body.number_of_records
    let search = new RegExp('.*' + req.body.filter_criteria.search_value + '.*', 'i')
    let findCriteria = {
      title: req.body.filter_criteria.search_value !== '' ? {$regex: search} : {$exists: true},
      category: req.body.filter_criteria.category_value !== '' ? req.body.filter_criteria.category_value : {$exists: true}
    }
    TemplateSurveys.aggregate([
      { $match: findCriteria },
      { $group: { _id: null, count: { $sum: 1 } } }
    ], (err, surveysCount) => {
      if (err) {
        return res.status(404)
          .json({status: 'failed', description: 'PollsCount not found'})
      }
      TemplateSurveys.aggregate([{$match: {$and: [findCriteria, {_id: {$gt: mongoose.Types.ObjectId(req.body.last_id)}}]}}, {$sort: {datetime: 1}}]).skip(recordsToSkip).limit(req.body.number_of_records)
      .exec((err, surveys) => {
        if (err) {
          logger.serverLog(TAG, `Error: ${err}`)
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error${JSON.stringify(err)}`
          })
        }
        res.status(200).json({
          status: 'success',
          payload: {surveys: surveys.reverse(), count: surveys.length > 0 ? surveysCount[0].count : ''}
        })
      })
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
 /* TemplateSurveys.find({}, (err, surveys) => {
    if (err) {
      logger.serverLog(TAG, `Error: ${err}`)
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error${JSON.stringify(err)}`
      })
    }
    // SurveyQuestions.aggregate([{
    //   $group: {
    //     _id: {surveyId: '$surveyId', statement: '$statement', options: '$options'}
    //   }},
    //   { $project: { statement: 1, options: 1, surveyId: 1 } }
    // ], (err2, questions) => {
    //   if (err2) {
    //     return res.status(404)
    //     .json({status: 'failed', description: 'Surveys not found'})
    //   }
    res.status(200).json({
      status: 'success',
      payload: surveys
    })
  })*/
}

exports.createPoll = function (req, res) {
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
          if (planUsage.polls_templates !== -1 && companyUsage.polls_templates >= planUsage.polls_templates) {
            return res.status(500).json({
              status: 'failed',
              description: `Your templates limit has reached. Please upgrade your plan to premium in order to create more templates`
            })
          }
          let pollPayload = {
            title: req.body.title,
            statement: req.body.statement,
            options: req.body.options,
            category: req.body.category
          }
          const poll = new TemplatePolls(pollPayload)

          // save model to MongoDB
          poll.save((err, pollCreated) => {
            if (err) {
              res.status(500).json({
                status: 'Failed',
                description: 'Failed to insert record'
              })
            } else {
              if (!req.user.isSuperUser) {
                CompanyUsage.update({companyId: companyUser.companyId},
                  { $inc: { polls_templates: 1 } }, (err, updated) => {
                    if (err) {
                      logger.serverLog(TAG, `ERROR ${JSON.stringify(err)}`)
                    }
                  })
              }
              res.status(201).json({status: 'success', payload: pollCreated})
            }
          })
        })
      })
    })
  })
}

exports.createSurvey = function (req, res) {
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
          if (planUsage.survey_templates !== -1 && companyUsage.survey_templates >= planUsage.survey_templates) {
            return res.status(500).json({
              status: 'failed',
              description: `Your templates limit has reached. Please upgrade your plan to premium in order to create more templates`
            })
          }
          let surveyPayload = {
            title: req.body.survey.title,
            description: req.body.survey.description,
            category: req.body.survey.category
          }
          const survey = new TemplateSurveys(surveyPayload)

          TemplateSurveys.create(survey, (err, survey) => {
            if (err) {
              return res.status(500).json({
                status: 'failed',
                description: `Internal Server Error ${JSON.stringify(err)}`
              })
            }
            if (!req.user.isSuperUser) {
              CompanyUsage.update({companyId: companyUser.companyId},
                { $inc: { survey_templates: 1 } }, (err, updated) => {
                  if (err) {
                    logger.serverLog(TAG, `ERROR ${JSON.stringify(err)}`)
                  }
                })
            }
            // after survey is created, create survey questions
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
    })
  })
}

exports.allCategories = function (req, res) {
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
    Category.find({'$or': [{
      companyId: companyUser.companyId}, {createdBySuperUser: true}]}, (err, categories) => {
      if (err) {
        logger.serverLog(TAG, `Error: ${err}`)
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error${JSON.stringify(err)}`
        })
      }
      res.status(200).json({
        status: 'success',
        payload: categories
      })
    })
  })
}

exports.createCategory = function (req, res) {
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
    let categoryPayload = {
      name: req.body.name,
      userId: req.user._id,
      companyId: companyUser.companyId
    }
    if (req.user.isSuperUser) {
      categoryPayload.createdBySuperUser = true
    }
    const category = new Category(categoryPayload)

    // save model to MongoDB
    category.save((err, categoryCreated) => {
      if (err) {
        res.status(500).json({
          status: 'Failed',
          description: 'Failed to insert record'
        })
      } else {
        res.status(201).json({status: 'success', payload: categoryCreated})
      }
    })
  })
}

exports.editCategory = function (req, res) {
  Category.findById(req.body._id, (err, category) => {
    if (err) {
      return res.status(500)
        .json({status: 'failed', description: 'Internal Server Error'})
    }
    if (!category) {
      return res.status(404)
        .json({status: 'failed', description: 'Record not found'})
    }
    category.name = req.body.name
    category.save((err2) => {
      if (err2) {
        return res.status(500)
          .json({status: 'failed', description: 'Poll update failed'})
      }
      res.status(201).json({status: 'success', payload: category})
    })
  })
}

exports.surveyDetails = function (req, res) {
  TemplateSurveys.find({_id: req.params.surveyid}, (err, survey) => {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    }
    // find questions
    SurveyQuestions.find({surveyId: req.params.surveyid})
      .populate('surveyId')
      .exec((err2, questions) => {
        if (err2) {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error ${JSON.stringify(err2)}`
          })
        }
        return res.status(200).json({status: 'success', payload: {survey, questions}})
      })
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
  let payload = [
    {
      questions: ['What is your policy on immigration?', 'How do you deal with illegal immigrants?', 'What is your policy for undocumented immigrants', 'How will you improve immigration system?'],
      answer: 'We called for fixing the "broken immigration system," including a path to citizenship for 11 million undocumented immigrants.',
      intent_name: 'q1-immigration'
    },
    {
      questions: ['What is your policy on same-sex marriage?', 'Do you agree with Supreme Court decision that legalized same-sex marriage?', 'Where do you stand on matter of same-sex marriage?'],
      answer: 'We applauded the U.S. Supreme Court decision that legalized same-sex marriage.',
      intent_name: 'q2-same-sex-marriage'
    },
    {
      questions: ['Are you in favor of abortion?', 'What is your policy on abortion?', 'Do you think every woman has right to abortion?'],
      answer: 'We believe unequivocally, like the majority of Americans, that every woman should have access to quality reproductive health care services, including safe and legal abortion.',
      intent_name: 'q2-abortion'
    },
    {
      questions: ['What is your policy on climate change?', 'Do you think climate change is a problem?', 'Ho do you tackle climate change?'],
      answer: 'Climate change poses a real and urgent threat to our economy, our national security, and our children\'s health and futures.',
      intent_name: 'q2-climate-change'
    },
    {
      questions: ['What is your policy on medicare?', 'How do you think can improve medicare?', 'What are facilities you would provide in the area of medicare?'],
      answer: 'We would not only would "fight any attempts by Republicans in Congress to privatize, voucherize, or \'phase out\' Medicare," but would allow Americans older than 55 to enroll.',
      intent_name: 'q2-medicare'
    },
    {
      questions: ['What is your stand on wall street issues?', 'What is your promise regarding wall street?', 'How can you improve the enforcement of regulations in wall street?'],
      answer: 'Our party promised to "vigorously implement, enforce, and build on" banking regulations enacted to curb risky practices by financial institutions and "will stop dead in its tracks every Republican effort to weaken it."',
      intent_name: 'q2-wall-street'
    },
    {
      questions: ['What are your views on Iran?', 'What is your policy regarding Iran?', 'What type of relations do you want with Iran?'],
      answer: 'President Barack Obama\'s agreement to relax economic sanctions on Iran in exchange for curbs on its nuclear program "verifiably cuts off all of Iran\'s pathways to a bomb without resorting to war."',
      intent_name: 'q2-iran'
    },
    {
      questions: ['What are your views of Israel??', 'What is your policy on Israel as Jewish state?', 'What are your views on conflict between Israel and Palestine'],
      answer: 'The platform backed a "secure and democratic Jewish state" of Israel and a chance for Palestinians to "govern themselves in their own viable state, in peace and dignity."',
      intent_name: 'q2-israel'
    },
    {
      questions: ['How do you think money should be used in politics?', 'What is your policy to fund your campaigns?', 'How do you raise money for your campaign?'],
      answer: 'We need to end secret, unaccountable money in politics by requiring, through executive order or legislation, significantly more disclosure and transparency -- by outside groups, federal contractors, and public corporations to their shareholders',
      intent_name: 'q2-money-in-politics'
    },
    {
      questions: ['What is your policy on voting rights?', 'How do you think you would ensure the right to vote for all the communities?', 'How you can implement voting rights in US?'],
      answer: 'We would fight laws requiring certain forms of voter identification "to preserve the fundamental right to vote."',
      intent_name: 'q2-voting-rights'
    }
  ]
  return res.status(200).json({status: 'success', payload})
}
