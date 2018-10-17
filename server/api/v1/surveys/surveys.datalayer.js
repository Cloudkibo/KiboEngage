const Surveys = require('./surveys.model')


exports.genericUpdateForSurvey = (query, updated, options) => {
  return Surveys.update(query, updated, options)
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