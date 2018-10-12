const TemplatePolls = require('./pollTemplate.model')
const TemplateSurveys = require('./surveyTemplate.model')
const mongoose = require('mongoose')
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