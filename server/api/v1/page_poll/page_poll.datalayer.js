const PagePoll = require('./page_poll.model')

exports.genericUpdate = (query, updated, options) => {
  return PagePoll.update(query, updated, options)
    .exec()
}
exports.genericFind = (query) => {
  return PagePoll.find(query).populate('companyId userId pollId')
    .exec()
}
