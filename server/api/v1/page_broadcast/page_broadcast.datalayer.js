const PageBroadcast = require('./page_broadcast.model')

exports.genericUpdate = (query, updated, options) => {
  return PageBroadcast.update(query, updated, options)
    .exec()
}

exports.aggregate = (query) => {
  return PageBroadcast.aggregate(query)
    .exec()
}
