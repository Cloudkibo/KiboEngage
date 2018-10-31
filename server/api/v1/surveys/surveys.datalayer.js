const Surveys = require('./surveys.model')


exports.findOneSurvey = (id) => {
  return Surveys.find({_id: id}).populate('userId companyId')
    .exec()
}

exports.genericFind = (query) => {
  return Surveys.find(query)
    .exec()
}

exports.genericUpdateForSurvey = (query, updated, options) => {
  return Surveys.update(query, updated, options)
    .exec()
}


exports.aggregateForSurveys = (query) => {
  return Surveys.aggregate(query)
    .exec()
}

exports.surveyFind = () => {
  return Surveys.find({}, {_id: 1, isresponded: 1})
    .exec()
}

exports.findServeyById = (req) => {
  return Surveys.findById(req.params.id)
  .exec()
}

exports.save = (survey) => {
  return survey.save()
  .exec()
}

exports.findByIdPopulate = (req) => {
  return Surveys.findById(req.params.id).populate('userId')
  .exec()
}

exports.surveyFindById = () => {
  return Surveys.findById(req.params.id)
  .exec()
}

exports.removeSurvey = (survey) => {
  return survey.remove()
 .exec()
}

exports.findQuestionSurveyById = (survey) => {
  return  Surveys.findOne({_id: survey._id})
  .exec()
}


exports.genericFindForSurvey = (query) => {
  return Surveys.find(query)
    .exec()
}

exports.aggregateSurvey = (query) => {
  return Surveys.aggregate(query)
    .exec()
}

exports.countSurveys = (query) => {
  return Surveys.count(query)
    .exec()
}

exports.createSurvey = (survey) => {
  return Surveys.create(survey)
} 