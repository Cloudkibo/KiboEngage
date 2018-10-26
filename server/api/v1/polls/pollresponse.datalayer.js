const PollResponse = require('./pollresponse.model')

exports.genericFindForPollResponse = (query) => {
  return PollResponse.find(query)
    .exec()
}
exports.aggregateForPollResponse = (query) => {
  return PollResponse.aggregate(query)
    .exec()
}
exports.createForPollResponse = (payload) => {
  let obj = new PollResponse(payload)
  return obj.save()
}
exports.deleteForPollResponse = (query) => {
  return PollResponse.deleteMany(query)
    .exec()
}
