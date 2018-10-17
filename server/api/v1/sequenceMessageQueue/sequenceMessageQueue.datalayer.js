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
