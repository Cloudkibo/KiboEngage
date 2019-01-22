exports.getCriterias = function (body, companyUser, seen) {
  let matchAggregate = { companyId: companyUser.companyId,
    'pageId': body.pageId === 'all' ? { $exists: true } : body.pageId,
    'datetime': body.days === 'all' ? { $exists: true } : {
      $gte: new Date(
        (new Date().getTime() - (body.days * 24 * 60 * 60 * 1000))),
      $lt: new Date(
        (new Date().getTime()))
    },
    'seen': seen ? true : { $exists: true }
  }
  return matchAggregate
}
