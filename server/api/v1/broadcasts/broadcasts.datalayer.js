const BroadcastsModel = require('./broadcasts.model')

exports.findOneBroadcastObjectUsingQuery = (query) => {
  return BroadcastsModel.findOne(query)
    .exec()
}

exports.aggregate = (query) => {
    return BroadcastsModel.aggregate(query)
      .exec()
}