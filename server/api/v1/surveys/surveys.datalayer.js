const Surveys = require('./surveys.model')

exports.genericUpdateForSurvey = (query, updated, options) => {
  return Surveys.update(query, updated, options)
    .exec()
}
