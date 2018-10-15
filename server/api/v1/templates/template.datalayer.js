const TemplatePolls = require('./pollTemplate.model')
const TemplateSurveys = require('./surveyTemplate.model')
const Category = require('./category.model')
const CompanyUsers = require('./../companyuser/companyuser.model')
const mongoose = require('mongoose')
const CompanyUsage = require('./../featureUsage/companyUsage.model')
const PlanUsage = require('./../featureUsage/planUsage.model')
const CompanyProfile = require('./../companyprofile/companyprofile.model')
const SurveyQuestions = require('./surveyQuestion.model')
const TemplateBroadcasts = require('./broadcastTemplate.model')
const TemplateBots = require('./bots_template.model')


exports.allPolls = () => {
  return TemplatePolls.find({})
      .exec()
}

exports.pollTemplateaggregateCount = (aggregateObject) => {
  return TemplatePolls.aggregate(aggregateObject)
      .exec()
}
exports.pollTemplateaggregateLimit = (aggregateObject) => {
  return TemplatePolls.aggregate([{$match: aggregateObject.findCriteria}, {$sort: {datetime: -1}}]).limit(aggregateObject.req.body.number_of_records)
        .exec()
}
exports.pollTemplateaggregateLimitNextPrevious = (aggregateObject) => {
  return TemplatePolls.aggregate([{$match: {$and: [aggregateObject.findCriteria, {_id: {$lt: mongoose.Types.ObjectId(aggregateObject.req.body.last_id)}}]}}, {$sort: {datetime: -1}}]).skip(aggregateObject.recordsToSkip).limit(aggregateObject.req.body.number_of_records)
    .exec()
}

exports.allSurvey = () => {
  return TemplateSurveys.find({})
        .exec()
}

exports.surveyTemplateaggregateCount = (aggregateObject) => {
  return TemplateSurveys.aggregate(aggregateObject)
      .exec()
}

exports.surveyTemplateaggregateLimit = (aggregateObject) => {
  return TemplateSurveys.aggregate([{$match: aggregateObject.findCriteria}, {$sort: {datetime: -1}}]).limit(aggregateObject.req.body.number_of_records)
        .exec()
}
exports.surveyTemplateaggregateLimitNextPrevious = (aggregateObject) => {
  return TemplateSurveys.aggregate([{$match: {$and: [aggregateObject.findCriteria, {_id: {$lt: mongoose.Types.ObjectId(aggregateObject.req.body.last_id)}}]}}, {$sort: {datetime: -1}}]).skip(aggregateObject.recordsToSkip).limit(aggregateObject.req.body.number_of_records)
    .exec()
}

exports.findOneCompanyUsersbyEmail = (req) => {
   
   return CompanyUsers.findOne({domain_email: req.user.domain_email})
   .exec()
}
exports.findOneCompanyProfiles = (req) => {
   
  return CompanyProfile.findOne({ownerId: req.user._id})
  .exec()
}

exports.findOneCompanyUsage = (companyUser) => {
   
  return CompanyUsage.findOne({companyId: companyUser.companyId})
  .exec()
}

exports.findOnePlanUsage = (companyProfile) => {
   
  return PlanUsage.findOne({planId: companyProfile.planId})
  .exec()
}

exports.findOneCompanyUsersbyCompId = (companyUser) => {
   
  return CompanyUsers.findOne({companyId: companyUser.companyId})
  .exec()
}

exports.savePolls = (poll) => {
  
 return  poll.save()
 .exec()

}

exports.saveSurveys = (survey) => {
  
  return  survey.save()
  .exec()
 
 }

 exports.createSurveys = (survey) => {

   return TemplateSurveys.create(survey)
   .exec()
 }

exports.companyUsageUpdate=(companyUser) => {

   return  CompanyUsage.update({companyId: companyUser.companyId},
    { $inc: { polls_templates: 1 } })
    .exec()
}

exports.CategoryFind = (companyUser) => {

  return Category.find({'$or': [{companyId: companyUser.companyId}, {createdBySuperUser: true}]})
  .exec()
}
exports.CategorySave = (category) => {

  return category.save()
  .exec()
}

exports.findCategroryById = (req) => {
  return Category.findById(req.body._id)
  .exec()
}

exports.findSurveyById = (req) => {
  return TemplateSurveys.find({_id: req.params.surveyid})
  .exec()
}

exports.findQuestionById = (req) => {findCategroryById
  SurveyQuestions.find({surveyId: req.params.surveyid}).populate('surveyId')  
 .exec()
}

exports.findPollById = (req) => {
  return TemplatePolls.findOne({_id: req.params.pollid})
  .exec()
}

exports.pollFindById = (req) => {
  return TemplatePolls.findById(req.params.id)
  .exec()

}
exports.removePoll = (poll) => {
  return poll.remove()
  .exec()
}

exports.pollCategoryById = (req) => {
  return Category.findById(req.params.id)
  .exec()

}

exports.removeCategory = (category) => {
  return category.remove()
  .exec()
}

exports.surveyFindById = (req) => {
  return TemplateSurveys.findById(req.params.id)
  .exec()

}
exports.removeSurvey = (survey) => {
  return survey.remove()
  .exec()
}


exports.BroadcastFindById = (req) => {
  return TemplateBroadcasts.findById(req.params.id)
  .exec()
}

exports.removeBroadcast = (broadcast) => {
  return broadcast.remove()
  .exec()
}

exports.saveBroadcast = (broadcast) => {

  return broadcast.save()
  .exec()
}

exports.findBroadcastById = (req) => {
  return TemplateBroadcasts.findOne({_id: req.params.broadcastid})
  .exec()
}

exports.findBotById = (req) => {
  return TemplateBots.findOne({_id: req.params.botid})
  .exec()
}
exports.BotFindById = (req) => {
  return TemplateBots.findById(req.body._id)
  .exec()
}
exports.botSave = (bot) => {

  return bot.save()
  .exec()
}
exports.removeBot = (bot) => {
  return bot.remove()
  .exec()
}
exports.botFind = (companyUser) => {

  return TemplateBots.find({'$or': [{companyId: companyUser.companyId}, {createdBySuperUser: true}]})
  .exec()
}
exports.broadcastFind = (companyUser) => {

  return TemplateBroadcasts.find({'$or': [{ companyId: companyUser.companyId}, {createdBySuperUser: true}]})
  .exec()
}

exports.surveyId = (req) => {
  TemplateSurveys.findById(req.body.survey._id)
}

exports.findQuestionSurveyById = (req) => {
  SurveyQuestions.find({surveyId: req.body.survey._id})
}