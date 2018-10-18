const AutopostingSubscriberMessage = require('./autopostingSubscriberMessages.model')

exports.createAutopostingSubscriberMessage = (payload) => {
  let obj = new AutopostingSubscriberMessage(payload)
  return obj.save()
}

exports.findOneAutopostingSubscriberMessage = (objectId) => {
  return AutopostingSubscriberMessage.findOne({_id: objectId})
    .exec()
}

exports.findOneAutopostingSubscriberMessageUsingQuery = (queryObject) => {
  return AutopostingSubscriberMessage.findOne(queryObject)
    .exec()
}

exports.findAllAutopostingSubscriberMessagesUsingQuery = (queryObject) => {
  return AutopostingSubscriberMessage.find(queryObject)
    .exec()
}

exports.findAutopostingSubscriberMessageUsingAggregate = (aggregateObject) => {
  return AutopostingSubscriberMessage.aggregate(aggregateObject)
    .exec()
}
exports.findOneAutopostingSubscriberMessageAndUpdate = (query, update, options) => {
  return AutopostingSubscriberMessage.findOneAndUpdate(query, update, options)
    .exec()
}

exports.genericFindByIdAndUpdate = (query, updated) => {
  return AutopostingSubscriberMessage.findByIdAndUpdate(query, updated, {new: true})
    .exec()
}
exports.genericUpdateAutopostingSubscriberMessage = (query, updated, options) => {
  return AutopostingSubscriberMessage.update(query, updated, options)
    .exec()
}
exports.createAutopostingSubscriberMessage = (payload) => {
  let obj = new AutopostingSubscriberMessage(payload)
  return obj.save()
}
exports.updateOneAutopostingSubscriberMessage = (id, payload) => {
  return AutopostingSubscriberMessage.updateOne({_id: id}, payload)
    .exec()
}
exports.deleteAutopostingSubscriberMessage = (objectId) => {
  return AutopostingSubscriberMessage.deleteOne({_id: objectId})
    .exec()
}
