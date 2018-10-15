const PollResponse = require('./pollresponse.model')

exports.createForPollResponse = (payload) => {
  let obj = new PollResponse(payload)
  return obj.save()
}
