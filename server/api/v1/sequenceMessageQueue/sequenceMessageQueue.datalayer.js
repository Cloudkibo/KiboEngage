const SequenceMessageQueue = require('./sequenceMessagingQueue.model')

exports.deleteMany = (query) => {
  return SequenceMessageQueue.deleteMany(query)
    .exec()
}
exports.create = (payload) => {
  let obj = new SequenceMessageQueue(payload)
  return obj.save()
}
exports.findAll = () => {
  return SequenceMessageQueue.find({}).populate('sequenceId subscriberId companyId sequenceMessageId')
    .exec()
}
exports.deleteOneObject = (id) => {
  return SequenceMessageQueue.delete({_id: id})
  .exec()
}
exports.genericUpdate = (query, updated, options) => {
  return SequenceMessageQueue.update(query, updated, options)
    .exec()
}
exports.removeForSequenceSubscribers = (sequenceId, subscriberId) => {
  return SequenceMessageQueue.remove(sequenceId).where('subscriberId').equals(subscriberId)
    .exec()
}
exports.genericFind = (query) => {
  return SequenceMessageQueue.find(query)
    .exec()
}
exports.findOne = (objectId) => {
  return SequenceMessageQueue.findOne({_id: objectId})
    .exec()
}
