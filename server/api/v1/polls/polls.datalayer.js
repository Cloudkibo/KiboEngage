const PollResponse = require('./pollresponse.model')
const Poll = require('./polls.model')

exports.createForPollResponse = (payload) => {
  let obj = new PollResponse(payload)
  return obj.save()
}

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
    .exec()
}
