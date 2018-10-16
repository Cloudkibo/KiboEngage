const Sequence = require('./sequence.model')
const Message = require('./message.model')
const SequenceSubscribers = require('./sequenceSubscribers.model')
const SequenceSubscribersMessages = require('./sequenceSubscribersMessages.model')

exports.genericFindForSequence = (query) => {
  return Sequence.find(query).populate('companyId userId')
    .exec()
}
exports.genericFindForSequenceMessages = (query) => {
  return Message.find(query).populate('sequenceId')
    .exec()
}
exports.genericFindForSequenceSubscribers = (query) => {
  return SequenceSubscribers.find(query).populate('subscriberId sequenceId companyId')
    .exec()
}
exports.genericUpdateForSequenceMessages = (query, updated, options) => {
  return Message.update(query, updated, options)
    .exec()
}
exports.genericUpdateForSubscriberMessages = (query, updated, options) => {
  return SequenceSubscribersMessages.update(query, updated, options)
    .exec()
}
exports.genericUpdateForSequenceSubscribers = (query, updated, options) => {
  return SequenceSubscribers.update(query, updated, options)
    .exec()
}
exports.removeForSequenceSubscribers = (sequenceId, subscriberId) => {
  return SequenceSubscribers.remove(sequenceId).where('subscriberId').equals(subscriberId)
    .exec()
}
exports.createForSequenceSubcriber = (payload) => {
  let obj = new SequenceSubscribers(payload)
  return obj.save()
}
