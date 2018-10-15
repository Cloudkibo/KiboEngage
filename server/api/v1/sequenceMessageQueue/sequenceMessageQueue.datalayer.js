const SequenceMessageQueue = require('./sequenceMessagingQueue.model')

exports.deleteMany = (query) => {
  return SequenceMessageQueue.deleteMany(query)
    .exec()
}
exports.create = (payload) => {
  let obj = new SequenceMessageQueue(payload)
  return obj.save()
}
