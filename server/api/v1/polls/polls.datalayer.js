<<<<<<< HEAD
const PollResponse = require('./pollresponse.model')
const Poll = require('./polls.model')
=======
const Polls = require('./polls.model')
>>>>>>> 28254c1d498a1617fbbbd2f5991e87a9ae570ff4

exports.genericFindForPolls = (query) => {
  return Polls.find(query).populate('companyId userId')
    .exec()
}
exports.createForPoll = (payload) => {
  let obj = new Polls(payload)
  return obj.save()
}

<<<<<<< HEAD
exports.findPoll = (query) => {
  return Poll.find(query)
    .exec()
}

exports.aggregatePoll = (query) => {
  return Poll.aggregate(query)
    .exec()
}

exports.aggregatePollResponse = (query) => {
  return PollResponse.aggregate(query)
=======
exports.aggregateForPolls = (query) => {
  return Polls.aggregate(query)
    .exec()
}
exports.deleteForPolls = (id) => {
  return Polls.deleteOne({_id: id})
>>>>>>> 28254c1d498a1617fbbbd2f5991e87a9ae570ff4
    .exec()
}
