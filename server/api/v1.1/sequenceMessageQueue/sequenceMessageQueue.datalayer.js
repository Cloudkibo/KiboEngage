/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const { callApi } = require('../utility')

exports.deleteMany = (queryObject) => {
  let query = {
    purpose: 'deleteMany',
    match: queryObject
  }
  return callApi(`sequence_message_queue`, 'delete', query, '', 'kiboengage')
}
exports.create = (payload) => {
  return callApi(`sequence_message_queue`, 'post', payload, '', 'kiboengage')
}
exports.findAll = () => {
  let query = {
    purpose: 'findAll',
    match: {}
  }
  return callApi(`sequence_message_queue/query`, 'post', query, '', 'kiboengage')
}
exports.deleteOneObject = (id) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: id}
  }
  return callApi(`sequence_message_queue`, 'delete', query, '', 'kiboengage')
}
exports.genericUpdate = (queryObject, updated, options) => {
  let query = {
    purpose: 'updateAll',
    match: queryObject,
    updated: updated
  }
  if (options.upsert) query.upsert = options.upsert
  if (options.new) query.new = options.new
  if (options.multi) query.multi = options.multi
  return callApi(`sequence_message_queue`, 'put', query, '', 'kiboengage')
}
exports.removeForSequenceSubscribers = (sequenceId, subscriberId) => {
  let query = {
    purpose: 'deleteMany',
    match: {sequenceId: sequenceId, subscriberId: subscriberId}
  }
  return callApi(`sequence_message_queue`, 'delete', query, '', 'kiboengage')
}
exports.genericFind = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`sequence_message_queue/query`, 'post', query, '', 'kiboengage')
}
exports.findOne = (objectId) => {
  let query = {
    purpose: 'findOne',
    match: {_id: objectId}
  }
  return callApi(`sequence_message_queue/query`, 'post', query, '', 'kiboengage')
}
