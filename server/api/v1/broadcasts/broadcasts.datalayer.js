const Broadcasts = require('./broadcasts.model')

exports.aggregateForBroadcasts = (aggregateObject) => {
  return Broadcasts.aggregate(aggregateObject)
    .exec()
}
exports.deleteForBroadcasts = (id) => {
  return Broadcasts.deleteOne({_id: id})
    .exec()
}
