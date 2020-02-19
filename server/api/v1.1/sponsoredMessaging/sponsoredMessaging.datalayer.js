const { callApi } = require('../utility')
const { kiboengage } = require('../../global/constants').serverConstants

exports.aggregateForSponsoredMessaging = (match, group, lookup, limit, sort, skip) => {
  let query = {
    purpose: 'aggregate',
    match: match
  }
  if (group) query.group = group
  if (lookup) query.lookup = lookup
  if (limit) query.limit = limit
  if (sort) query.sort = sort
  if (skip) query.skip = skip

  return callApi(`sponsoredMessaging/query`, 'post', query, kiboengage)
}

exports.countDocuments = (filter) => {
  let query = {
    purpose: 'aggregate',
    match: filter,
    group: { _id: null, count: { $sum: 1 } }
  }
  return callApi(`sponsoredMessaging/query`, 'post', query, kiboengage)
}

exports.createForSponsoredMessaging = (payload) => {
  return callApi(`sponsoredMessaging`, 'post', payload, kiboengage)
}

exports.genericUpdateSponsoredMessaging = (queryObject, updated, options) => {
  let query = {
    purpose: 'updateAll',
    match: queryObject,
    updated: updated
  }
  if (options) {
    if (options.upsert) query.upsert = options.upsert
    if (options.new) query.new = options.new
    if (options.multi) query.multi = options.multi
  }
  return callApi(`sponsoredMessaging`, 'put', query, kiboengage)
}