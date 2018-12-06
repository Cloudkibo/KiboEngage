const Broadcasts = require('./broadcasts.model')

exports.aggregateForBroadcasts = (aggregateObject) => {
  return Broadcasts.aggregate(aggregateObject)
    .exec()
}
exports.deleteForBroadcasts = (id) => {
  return Broadcasts.deleteOne({_id: id})
    .exec()
}
exports.createForBroadcast = (payload) => {
  let obj = new Broadcasts(payload)
  return obj.save()
}

exports.countBroadcasts = (query) => {
  return Broadcasts.count(query)
    .exec()
}

exports.updateBroadcast = (query) => {
  return Broadcasts.update(query)
    .exec()
}

exports.findBroadcastsWithSortLimit = (query, sort, limit) => {
  return Broadcasts.find(query)
    .sort(sort)
    .limit(limit)
    .exec()
}
