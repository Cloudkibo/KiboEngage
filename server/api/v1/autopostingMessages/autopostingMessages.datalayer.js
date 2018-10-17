const AutopostingMessages = require('./autopostingMessages.model')

exports.findOneAutopostingMessage = (objectId) => {
  return AutopostingMessages.findOne({_id: objectId})
    .exec()
}

exports.findOneAutopostingMessageUsingQuery = (queryObject) => {
  return AutopostingMessages.findOne(queryObject)
    .exec()
}

exports.findAllAutopostingMessagesUsingQuery = (queryObject) => {
  return AutopostingMessages.find(queryObject)
    .exec()
}
exports.findAutopostingMessagesUsingQueryWithLimit = (queryObject, limit) => {
  return AutopostingMessages.find(queryObject).limit(limit)
    .populate('pageId companyId autopostingId')
    .exec()
}
exports.findAutopostingMessageUsingAggregate = (aggregateObject) => {
  return AutopostingMessages.aggregate(aggregateObject)
    .exec()
}
exports.findOneAutopostingMessageAndUpdate = (query, update, options) => {
  return AutopostingMessages.findOneAndUpdate(query, update, options)
    .exec()
}

exports.genericFindByIdAndUpdate = (query, updated) => {
  return AutopostingMessages.findByIdAndUpdate(query, updated, {new: true})
    .exec()
}
exports.genericUpdateAutopostingMessage = (query, updated, options) => {
  return AutopostingMessages.update(query, updated, options)
    .exec()
}
exports.createAutopostingMessage = (payload) => {
  let obj = new AutopostingMessages(payload)
  return obj.save()
}
exports.updateOneAutopostingMessage = (id, payload) => {
  return AutopostingMessages.updateOne({_id: id}, payload)
    .exec()
}
exports.deleteAutopostingMessage = (objectId) => {
  return AutopostingMessages.deleteOne({_id: objectId})
    .exec()
}
