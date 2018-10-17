const PageAdminSubscription = require('./pageadminsubscriptions.model')

exports.genericFind = (query) => {
  return PageAdminSubscription.find(query).populate('companyId userId pageId')
    .exec()
}
