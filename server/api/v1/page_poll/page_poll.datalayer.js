const PagePoll = require('./page_poll.model')

exports.genericUpdate = (query, updated, options) => {
  return PagePoll.update(query, updated, options)
    .exec()
}

exports.aggregate = (query) => {
  return PagePoll.aggregate(query)
    .exec()
}

exports.find = (query) => {
  return PagePoll.find(query)
    .exec()
}