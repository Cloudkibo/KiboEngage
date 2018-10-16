const PageBroadcast = require('./page_broadcast.model')

exports.genericUpdate = (query, updated, options) => {
  return PageBroadcast.update(query, updated, options)
    .exec()
}

exports.genericFind = (query) => {
  return PageBroadcast.find(query)
    .exec()
}
