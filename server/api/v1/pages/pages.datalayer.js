const Pages = require('./Pages.model')

exports.findPages = function (pagesFindCriteria) {
  return Pages.find(pagesFindCriteria)
  .exec()
}

exports.findPagesByCompanyId = function (companyUser) {
  return Pages.findOne({companyId: companyUser.companyId, connected: true}
  .exec()
}