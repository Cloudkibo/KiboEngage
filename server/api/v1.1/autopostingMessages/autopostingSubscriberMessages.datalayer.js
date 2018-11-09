const { callApi } = require('../utility')

exports.createAutopostingSubscriberMessage = (payload) => {
  return callApi(`autoposting_messages/response`, 'post', payload, '', 'kiboengage')
}

exports.findOneAutopostingSubscriberMessage = (objectId) => {
  let query = {
    purpose: 'findOne',
    match: {_id: objectId}
  }
  return callApi(`autoposting_messages/response/query`, 'post', query, '', 'kiboengage')
}

exports.findOneAutopostingSubscriberMessageUsingQuery = (queryObject) => {
  let query = {
    purpose: 'findOne',
    match: queryObject
  }
  return callApi(`autoposting_messages/response/query`, 'post', query, '', 'kiboengage')
}

exports.findAllAutopostingSubscriberMessagesUsingQuery = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`autoposting_messages/response/query`, 'post', query, '', 'kiboengage')
}

exports.findAutopostingSubscriberMessageUsingAggregate = (aggregateObject) => {
  // We will call the db layer with aggregate parameter - currently not used in controller
  return new Promise(() => {})
}
exports.findOneAutopostingSubscriberMessageAndUpdate = (queryObject, update, options) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: update
  }
  if (options.upsert) query.upsert = options.upsert
  if (options.new) query.new = options.new
  return callApi(`autoposting_messages/response`, 'put', query, '', 'kiboengage')
}

exports.genericFindByIdAndUpdate = (queryObject, updated) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: updated,
    new: true
  }
  return callApi(`autoposting_messages/response`, 'put', query, '', 'kiboengage')
}
exports.genericUpdateAutopostingSubscriberMessage = (queryObject, updated, options) => {
  let query = {
    purpose: 'updateAll',
    match: queryObject,
    updated: updated
  }
  if (options.upsert) query.upsert = options.upsert
  if (options.new) query.new = options.new
  if (options.multi) query.multi = options.multi
  return callApi(`autoposting_messages/response`, 'put', query, '', 'kiboengage')
}
exports.updateOneAutopostingSubscriberMessage = (id, payload) => {
  let query = {
    purpose: 'updateOne',
    match: {_id: id},
    updated: payload
  }
  return callApi(`autoposting_messages/response`, 'put', query, '', 'kiboengage')
}
exports.deleteAutopostingSubscriberMessage = (objectId) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: objectId}
  }
  return callApi(`autoposting_messages/response`, 'delete', query, '', 'kiboengage')
}
exports.countAutopostingMessagesDocuments = (filter) => {
  let query = {
    purpose: 'aggregate',
    match: filter,
    group: { _id: null, count: { $sum: 1 } }
  }
  return callApi(`autoposting_messages/response/query`, 'post', query, '', 'kiboengage')
}
