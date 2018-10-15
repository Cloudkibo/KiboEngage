/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const AutomationQueue = require('./automationQueue.model')

exports.findOneAutomationQueueObject = (objectId) => {
  return AutomationQueue.findOne({_id: objectId})
    .exec()
}

exports.findAllAutomationQueueObjects = () => {
  return AutomationQueue.find({})
    .exec()
}

exports.findOneAutomationQueueObjectUsingQuery = (queryObject) => {
  return AutomationQueue.findOne(queryObject)
    .exec()
}

exports.findAllAutomationQueueObjectsUsingQuery = (queryObject) => {
  return AutomationQueue.find(queryObject)
    .exec()
}

exports.createAutomationQueueObject = (payload) => {
  let obj = new AutomationQueue(payload)
  return obj.save()
}

exports.updateAutomationQueueObject = (objectId, payload) => {
  return AutomationQueue.updateOne({_id: objectId}, payload)
    .exec()
}

exports.deleteAutomationQueueObject = (objectId) => {
  return AutomationQueue.deleteOne({_id: objectId})
    .exec()
}

exports.deleteAutomationQueueObjectUsingQuery = (query) => {
  return AutomationQueue.deleteOne(query)
    .exec()
}
