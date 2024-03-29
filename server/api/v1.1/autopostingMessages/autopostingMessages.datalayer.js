const { callApi } = require('../utility')

exports.findOneAutopostingMessage = (objectId, companyId) => {
  let query = {
    purpose: 'findOne',
    match: {_id: objectId, companyId}
  }
  return callApi(`autoposting_messages/query`, 'post', query, 'kiboengage')
}

exports.findOneAutopostingMessageUsingQuery = (queryObject) => {
  let query = {
    purpose: 'findOne',
    match: queryObject
  }
  return callApi(`autoposting_messages/query`, 'post', query, 'kiboengage')
}

exports.findAllAutopostingMessagesUsingQuery = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`autoposting_messages/query`, 'post', query, 'kiboengage')
}
exports.findAutopostingMessagesUsingQueryWithLimit = (queryObject, limit) => {
  let query = {
    purpose: 'findAll',
    match: queryObject,
    limit: limit
  }
  return callApi(`autoposting_messages/query`, 'post', query, 'kiboengage')
}

exports.findOneAutopostingMessageAndUpdate = (queryObject, update, options) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: update
  }
  if (options.upsert) query.upsert = options.upsert
  if (options.new) query.new = options.new
  return callApi(`autoposting_messages`, 'put', query, 'kiboengage')
}

exports.genericFindByIdAndUpdate = (queryObject, updated) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: updated,
    new: true
  }
  return callApi(`autoposting_messages`, 'put', query, 'kiboengage')
}
exports.genericUpdateAutopostingMessage = (queryObject, updated, options) => {
  let query = {
    purpose: 'updateAll',
    match: queryObject,
    updated: updated
  }
  if (options.upsert) query.upsert = options.upsert
  if (options.new) query.new = options.new
  if (options.multi) query.multi = options.multi
  return callApi(`autoposting_messages`, 'put', query, 'kiboengage')
}
exports.createAutopostingMessage = (payload) => {
  return callApi(`autoposting_messages`, 'post', payload, 'kiboengage')
}
exports.updateOneAutopostingMessage = (id, payload) => {
  let query = {
    purpose: 'updateOne',
    match: {_id: id},
    updated: payload
  }
  return callApi(`autoposting_messages`, 'put', query, 'kiboengage')
}
exports.deleteAutopostingMessage = (objectId) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: objectId}
  }
  return callApi(`autoposting_messages`, 'delete', query, 'kiboengage')
}
exports.countAutopostingMessagesDocuments = (filter) => {
  let query = {
    purpose: 'aggregate',
    match: filter,
    group: { _id: null, count: { $sum: 1 } }
  }
  return callApi(`autoposting_messages/query`, 'post', query, 'kiboengage')
}

exports.findAutopostingMessageUsingAggregate = (match, group, lookup, limit, sort, skip) => {
  let query = {
    purpose: 'aggregate',
    match: match
  }
  if (group) query.group = group
  if (lookup) query.lookup = lookup
  if (limit) query.limit = limit
  if (sort) query.sort = sort
  if (skip) query.skip = skip

  return callApi(`autoposting_messages/query`, 'post', query, 'kiboengage')
}

exports.findAutopostingMessageUsingAggregateForKiboDash = (match, group, lookup, limit, sort, skip) => {
  let query = {
    purpose: 'aggregate',
    match: match
  }
  if (group) query.group = group
  if (lookup) query.lookup = lookup
  if (limit) query.limit = limit
  if (sort) query.sort = sort
  if (skip) query.skip = skip

  return callApi(`autoposting_messages/kiboDashQuery`, 'post', query, 'kiboengage')
}
