/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const { callApi } = require('../utility')

exports.findOneAutopostingObject = (objectId) => {
  let query = {
    purpose: 'findOne',
    match: {_id: objectId}
  }
  return callApi(`autoposting/query`, 'post', query, '', 'kiboengage')
}

exports.findOneAutopostingObjectUsingQuery = (queryObject) => {
  let query = {
    purpose: 'findOne',
    match: queryObject
  }
  return callApi(`autoposting/query`, 'post', query, '', 'kiboengage')
}

exports.findAllAutopostingObjectsUsingQuery = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`autoposting/query`, 'post', query, '', 'kiboengage')
}

exports.findAutopostingObjectUsingAggregate = (aggregateObject) => {
  // We will call the db layer with aggregate parameter - currently not used in controller
  return new Promise(() => {})
}

exports.createAutopostingObject = (payload) => {
  return callApi(`autoposting`, 'post', payload, '', 'kiboengage')
}

exports.findOneAutopostingObjectAndUpdate = (queryObject, update, options) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: update
  }
  if (options.upsert) query.upsert = options.upsert
  if (options.new) query.new = options.new
  return callApi(`autoposting`, 'put', query, '', 'kiboengage')
}

exports.genericFindByIdAndUpdate = (queryObject, updated) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: updated,
    new: true
  }
  return callApi(`autoposting`, 'put', query, '', 'kiboengage')
}
exports.genericUpdateAutopostingObject = (queryObject, updated, options) => {
  let query = {
    purpose: 'updateAll',
    match: queryObject,
    updated: updated
  }
  if (options.upsert) query.upsert = options.upsert
  if (options.new) query.new = options.new
  if (options.multi) query.multi = options.multi
  return callApi(`autoposting`, 'put', query, '', 'kiboengage')
}

exports.deleteAutopostingObject = (objectId) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: objectId}
  }
  return callApi(`autoposting`, 'delete', query, '', 'kiboengage')
}

exports.countAutopostingDocuments = (filter) => {
  let query = {
    purpose: 'aggregate',
    match: filter,
    group: { _id: null, count: { $sum: 1 } }
  }
  return callApi(`autoposting/query`, 'post', query, '', 'kiboengage')
}
