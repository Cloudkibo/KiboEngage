const TagsModel = require('./tags.model')

exports.findTag = (query) => {
  return TagsModel.find(query)
    .exec()
}
