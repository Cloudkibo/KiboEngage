const Polls = require('./polls.model')

exports.findOnePoll = (id) => {
  return Polls.find({_id: id}).populate('companyId userId')
    .exec()
}

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
