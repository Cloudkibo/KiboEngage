const PageAdminSubscription = require('./pageadminsubscriptions.model')

exports.genericFind = (query) => {
  return PageAdminSubscription.find(query)
    .exec()
}
