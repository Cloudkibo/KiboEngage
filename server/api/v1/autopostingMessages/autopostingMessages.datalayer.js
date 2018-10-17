const AutopostingMessages = require('./autopostingMessages.model')

exports.createAutopostingMessage = (payload) => {
  let obj = new AutopostingMessages(payload)
  return obj.save()
}
exports.updateOneAutopostingMessage = (id, payload) => {
  return AutopostingMessages.updateOne({_id: id}, payload)
    .exec()
}
