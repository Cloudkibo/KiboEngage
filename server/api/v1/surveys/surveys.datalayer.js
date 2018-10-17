const Surveys = require('./surveys.model')

exports.findOneSurvey = (id) => {
  return Surveys.find({_id: id}).populate('userId companyId')
    .exec()
}

exports.genericFind = (query) => {
  return Surveys.find(query).populate('userId companyId')
    .exec()
}

exports.genericUpdateForSurvey = (query, updated, options) => {
  return Surveys.update(query, updated, options)
    .exec()
}
