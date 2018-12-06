const { callApi } = require('../utility')

exports.genericFindForSequence = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`sequence_messaging/query`, 'post', query, '', 'kiboengage')
}
exports.findOneSequence = (objectId) => {
  let query = {
    purpose: 'findOne',
    match: {_id: objectId}
  }
  return callApi(`sequence_messaging/query`, 'post', query, '', 'kiboengage')
}

exports.findSequenceUsingAggregate = (match, group = null, lookup = null, limit = null, sort = null, skip = null) => {
  let query = {
    purpose: 'aggregate',
    match: match
  }
  if (group) query.group = group
  if (lookup) query.lookup = lookup
  if (limit) query.limit = limit
  if (sort) query.sort = sort
  if (skip) query.skip = skip

  return callApi(`sequence_messaging/query`, 'post', query, '', 'kiboengage')
}
exports.countSequences = (filter) => {
  let query = {
    purpose: 'aggregate',
    match: filter,
    group: { _id: null, count: { $sum: 1 } }
  }
  return callApi(`sequence_messaging/query`, 'post', query, '', 'kiboengage')
}

exports.genericFindSequenceWithLimit = (queryObject, limit) => {
  let query = {
    purpose: 'aggregate',
    match: queryObject
  }
  if (limit) query.limit = limit
  return callApi(`sequence_messaging/query`, 'post', query, '', 'kiboengage')
}

exports.genericFindByIdAndUpdateSequence = (queryObject, updated) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: updated,
    new: true
  }
  return callApi(`sequence_messaging`, 'put', query, '', 'kiboengage')
}
exports.genericFindByIdAndUpdateMessage = (queryObject, updated) => {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: updated,
    new: true
  }
  return callApi(`sequence_messaging/message`, 'put', query, '', 'kiboengage')
}
exports.genericFindForSequenceMessages = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`sequence_messaging/message/query`, 'post', query, '', 'kiboengage')
}
exports.genericFindForSequenceSubscribers = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`sequence_subscribers/query`, 'post', query, '', 'kiboengage')
}
exports.genericUpdateForSequenceMessages = (queryObject, updated, options) => {
  let query = {
    purpose: 'updateAll',
    match: queryObject,
    updated: updated
  }
  if (options.upsert) query.upsert = options.upsert
  if (options.new) query.new = options.new
  if (options.multi) query.multi = options.multi
  return callApi(`sequence_messaging/message`, 'put', query, '', 'kiboengage')
}
exports.genericUpdateForSubscriberMessages = (queryObject, updated, options) => {
  let query = {
    purpose: 'updateAll',
    match: queryObject,
    updated: updated
  }
  if (options.upsert) query.upsert = options.upsert
  if (options.new) query.new = options.new
  if (options.multi) query.multi = options.multi
  return callApi(`sequence_subscribers/message`, 'put', query, '', 'kiboengage')
}
exports.genericFindForSubscriberMessages = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`sequence_subscribers/message/query`, 'post', query, '', 'kiboengage')
}
exports.genericUpdateForSequenceSubscribers = (queryObject, updated, options) => {
  let query = {
    purpose: 'updateAll',
    match: queryObject,
    updated: updated
  }
  if (options.upsert) query.upsert = options.upsert
  if (options.new) query.new = options.new
  if (options.multi) query.multi = options.multi
  return callApi(`sequence_subscribers`, 'put', query, '', 'kiboengage')
}

exports.removeForSequenceSubscribers = (sequenceId, subscriberId) => {
  // return SequenceSubscribers.remove({sequenceId: sequenceId}).where('subscriberId').equals(subscriberId)
  //   .exec()

  let query = {
    purpose: 'deleteMany',
    match: {sequenceId: sequenceId, subscriberId: subscriberId}
  }
  return callApi(`sequence_subscribers`, 'delete', query, '', 'kiboengage')
}

exports.createForSequenceSubcriber = (payload) => {
  return callApi(`sequence_subscribers`, 'post', payload, '', 'kiboengage')
}
exports.createForSequenceSubscribersMessages = (payload) => {
  return callApi(`sequence_subscribers/message`, 'post', payload, '', 'kiboengage')
}
exports.createSequence = (payload) => {
  return callApi(`sequence_messaging`, 'post', payload, '', 'kiboengage')
}
exports.createMessage = (payload) => {
  return callApi(`sequence_messaging/message`, 'post', payload, '', 'kiboengage')
}
exports.deleteSequenceMessage = (objectId) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: objectId}
  }
  return callApi(`sequence_messaging/message`, 'delete', query, '', 'kiboengage')
}
exports.deleteManySequenceMessages = (queryObject) => {
  let query = {
    purpose: 'deleteMany',
    match: queryObject
  }
  return callApi(`sequence_messaging/message`, 'delete', query, '', 'kiboengage')
}
exports.deleteSequence = (objectId) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: objectId}
  }
  return callApi(`sequence_messaging`, 'delete', query, '', 'kiboengage')
}

exports.deleteManySequenceSubscribers = (queryObject) => {
  let query = {
    purpose: 'deleteMany',
    match: queryObject
  }
  return callApi(`sequence_subscribers`, 'delete', query, '', 'kiboengage')
}
