const Polls = require('./polls.model')

exports.genericFindForPolls = (query) => {
  return Polls.find(query).populate('companyId userId')
    .exec()
}
exports.createForPoll = (payload) => {
  let obj = new Polls(payload)
  return obj.save()
}

exports.aggregateForPolls = (query) => {
  return Polls.aggregate(query)
    .exec()
}
exports.deleteForPolls = (id) => {
  return Polls.deleteOne({_id: id})
    .exec()
}
