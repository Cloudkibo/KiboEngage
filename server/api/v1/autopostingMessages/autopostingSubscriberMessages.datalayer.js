const AutopostingSubscriberMessage = require('./autopostingSubscriberMessages.model')

exports.createAutopostingSubscriberMessage = (payload) => {
  let obj = new AutopostingSubscriberMessage(payload)
  return obj.save()
}
