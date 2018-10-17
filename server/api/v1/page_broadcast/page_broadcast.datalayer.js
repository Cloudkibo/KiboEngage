const PageBroadcast = require('./page_broadcast.model')

exports.genericUpdate = (query, updated, options) => {
  return PageBroadcast.update(query, updated, options)
    .exec()
}

<<<<<<< HEAD
exports.aggregate = (query) => {
  return PageBroadcast.aggregate(query)
    .exec()
}
=======
exports.genericFind = (query) => {
  return PageBroadcast.find(query)
    .exec()
}
exports.createForBroadcastPage = (payload) => {
  let obj = new PageBroadcast(payload)
  return obj.save()
}
>>>>>>> 28254c1d498a1617fbbbd2f5991e87a9ae570ff4
