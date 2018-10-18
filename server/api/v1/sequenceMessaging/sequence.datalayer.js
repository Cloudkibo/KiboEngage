const Sequence = require('./sequence.model')
const Message = require('./message.model')
const SequenceSubscribers = require('./sequenceSubscribers.model')
const SequenceSubscribersMessages = require('./sequenceSubscribersMessages.model')

exports.genericFindForSequence = (query) => {
  return Sequence.find(query).populate('companyId userId')
    .exec()
}
exports.findOneSequence = (objectId) => {
  return Sequence.findOne({_id: objectId}).populate('companyId userId')
    .exec()
}
exports.findSequenceUsingAggregate = (aggregateObject) => {
  return Sequence.aggregate(aggregateObject)
    .exec()
}
exports.genericFindSequenceWithLimit = (query, limit) => {
  return Sequence.find(query).limit(limit)
    .exec()
}
exports.genericFindByIdAndUpdateSequence = (query, updated) => {
  return Sequence.findByIdAndUpdate(query, updated, {new: true})
    .exec()
}
exports.genericFindByIdAndUpdateMessage = (query, updated) => {
  return Message.findByIdAndUpdate(query, updated, {new: true})
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
exports.createSequence = (payload) => {
  let obj = new Sequence(payload)
  return obj.save()
}
exports.createMessage = (payload) => {
  let obj = new Message(payload)
  return obj.save()
}
exports.deleteSequenceMessage = (objectId) => {
  return Message.deleteOne({_id: objectId})
    .exec()
}
exports.deleteManySequenceMessages = (query) => {
  return Message.deleteMany(query)
    .exec()
}
exports.deleteSequence = (objectId) => {
  return Sequence.deleteOne({_id: objectId})
    .exec()
}

exports.deleteManySequenceSubscribers = (query) => {
  return SequenceSubscribers.deleteMany(query)
    .exec()
}
