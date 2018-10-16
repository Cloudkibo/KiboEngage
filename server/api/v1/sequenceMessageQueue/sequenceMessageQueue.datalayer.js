const SequenceMessageQueue = require('./sequenceMessagingQueue.model')

exports.deleteMany = (query) => {
  return SequenceMessageQueue.deleteMany(query)
    .exec()
}
exports.create = (payload) => {
  let obj = new SequenceMessageQueue(payload)
  return obj.save()
}
exports.genericUpdate = (query, updated, options) => {
  return SequenceMessageQueue.update(query, updated, options)
    .exec()
}
exports.removeForSequenceSubscribers = (sequenceId, subscriberId) => {
  return SequenceMessageQueue.remove(sequenceId).where('subscriberId').equals(subscriberId)
    .exec()
}
exports.deleteMany = (query) => {
  return SequenceMessageQueue.deleteMany(query)
    .exec()
}
