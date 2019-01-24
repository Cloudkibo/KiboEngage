const PageAdminSubscription = require('./pageadminsubscriptions.model')

exports.genericFind = (query) => {
  return PageAdminSubscription.find(query)
    .exec()
}

exports.create = (payload) => {
  let obj = new PageAdminSubscription(payload)
  return obj.save()
}
