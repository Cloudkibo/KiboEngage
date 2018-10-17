/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const AutoPostingModel = require('./autoposting.model')

exports.findOneAutopostingObject = (objectId) => {
  return AutoPostingModel.findOne({_id: objectId})
    .exec()
}

exports.findOneAutopostingObjectUsingQuery = (queryObject) => {
  return AutoPostingModel.findOne(queryObject)
    .exec()
}

exports.findAllAutopostingObjectsUsingQuery = (queryObject) => {
  return AutoPostingModel.find(queryObject).populate('userId companyId')
    .exec()
}

exports.findAutopostingObjectUsingAggregate = (aggregateObject) => {
  return AutoPostingModel.aggregate(aggregateObject)
    .exec()
}

exports.createAutopostingObject = (payload) => {
  let obj = new AutoPostingModel(payload)
  return obj.save()
}

exports.findOneAutopostingObjectAndUpdate = (query, update, options) => {
  return AutoPostingModel.findOneAndUpdate(query, update, options)
    .exec()
}

exports.genericFindByIdAndUpdate = (query, updated) => {
  return AutoPostingModel.findByIdAndUpdate(query, updated, {new: true})
    .exec()
}
exports.genericUpdateAutopostingObject = (query, updated, options) => {
  return AutoPostingModel.update(query, updated, options)
    .exec()
}

exports.deleteAutopostingObject = (objectId) => {
  return AutoPostingModel.deleteOne({_id: objectId})
    .exec()
}

exports.countAutopostingDocuments = (filter) => {
  return AutoPostingModel.countDocuments(filter)
    .exec()
}
