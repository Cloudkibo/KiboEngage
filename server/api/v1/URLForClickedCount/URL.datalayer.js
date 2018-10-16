const URL = require('./URL.model')

exports.createURLObject = (payload) => {
  let obj = new URL(payload)
  return obj.save()
}
exports.findOneURL = (id) => {
  return URL.findOne({_id: id})
    .populate('subscriberId')
    .exec()
}
exports.updateOneURL = (id, payload) => {
  return URL.updateOne({_id: id}, payload)
    .exec()
}
exports.deleteOneURL = (id) => {
  return URL.deleteOne({_id: id})
    .exec()
}
