const Surveys = require('./surveys.model')

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
  return Surveys.findById(req.body.survey._id)
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

