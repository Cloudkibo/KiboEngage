/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const CustomerModel = require('./customer.model')

exports.findOneObject = (id) => {
  return CustomerModel.findOne({_id: id})
    .exec()
}

exports.findUsingQuery = (query) => {
  return CustomerModel.findOne(query)
    .exec()
}
exports.updateCustomerObject = (id, payload) => {
  return CustomerModel.updateOne({_id: id}, payload)
    .exec()
}

exports.genericUpdateCustomerObject = (query, updated, options) => {
  return CustomerModel.update(query, updated, options)
    .exec()
}

exports.updateCustomerObjectUsingQuery = (query, payload, options) => {
  return CustomerModel.update(query, payload, options)
}

exports.createCustomerObject = (payload) => {
  let obj = new CustomerModel(payload)
  return obj.save()
}
exports.findAndUpdateCustomerObject = (query, updated) => {
  return CustomerModel.findOneAndUpdate(query, updated, {new: true})
    .exec()
}
