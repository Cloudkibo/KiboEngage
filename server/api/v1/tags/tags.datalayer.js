const Tags = require('./tags.model')

exports.genericFind = (query) => {
  return Tags.find(query)
    .exec()
}
