const TemplatePolls = require('./pollTemplate.model')
const TemplateSurveys = require('./surveyTemplate.model')
const Category = require('./category.model')
const CompanyUsers = require('./../companyuser/companyuser.model')
const mongoose = require('mongoose')
const CompanyUsage = require('./../featureUsage/companyUsage.model')
const PlanUsage = require('./../featureUsage/planUsage.model')
const CompanyProfile = require('./../companyprofile/companyprofile.model')
const SurveyQuestions = require('./surveyQuestion.model')

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

exports.findQuestionById = (req) => {
  SurveyQuestions.find({surveyId: req.params.surveyid}).populate('surveyId')  
 .exec()
}