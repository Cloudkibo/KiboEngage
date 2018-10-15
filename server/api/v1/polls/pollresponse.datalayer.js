const PollResponse = require('./pollresponse.model')

exports.aggregateForPollResponse = (query) => {
  return PollResponse.aggregate(query)
    .exec()
}
exports.createForPollResponse = (payload) => {
  let obj = new PollResponse(payload)
  return obj.save()
}
