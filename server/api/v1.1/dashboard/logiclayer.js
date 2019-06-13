const TAG = 'api/pages/dashboard.controller.js'
const logger = require('../../../components/logger')

exports.getCriterias = function (body, companyUser, seen, pageIds) {
  let matchAggregate = { companyId: companyUser.companyId.toString(),
    'pageId': body.pageId === 'all' ? {$in: pageIds} : body.pageId,
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

exports.queryForSubscribers = function (body, companyUser, isSubscribed, pageIds) {
  let query = [
    {$match: { companyId: companyUser.companyId,
      'datetime': body.days === 'all' ? { $exists: true } : {
        $gte: new Date(
          (new Date().getTime() - (body.days * 24 * 60 * 60 * 1000))),
        $lt: new Date(
          (new Date().getTime()))
      },
      isSubscribed: isSubscribed,
      'pageId': body.pageId === 'all' ? {$in: pageIds} : body.pageId
    }
    },
    {$group: {
      _id: null,
      count: {$sum: 1}}
    }
  ]
  return query
}

exports.queryForSubscribersGraph = function (body, companyUser, isSubscribed, pageIds) {
  let query = [
    {$match: { companyId: companyUser.companyId,
      'datetime': body.days === 'all' ? { $exists: true } : {
        $gte: new Date(
          (new Date().getTime() - (body.days * 24 * 60 * 60 * 1000))),
        $lt: new Date(
          (new Date().getTime()))
      },
      isSubscribed: isSubscribed,
      'pageId': body.pageId === 'all' ? {$in: pageIds} : body.pageId
    }
    },
    {$group: {
      _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
      count: {$sum: 1}}
    }
  ]
  logger.serverLog(TAG,
    `final query ${JSON.stringify(
      query)}`, 'debug')
  return query
}
exports.getCriteriasForAutopostingByType = function (body, companyUser, type) {
  let matchAggregate = { companyId: companyUser.companyId.toString(),
    'datetime': body.days === 'all' ? { $exists: true } : {
      $gte: new Date(
        (new Date().getTime() - (body.days * 24 * 60 * 60 * 1000))),
      $lt: new Date(
        (new Date().getTime()))
    },
    subscriptionType: type
  }
  let groupAggregate = {
    _id: null,
    count: {$sum: 1}}
  return {matchAggregate, groupAggregate}
}
exports.getCriteriasForAutopostingByTypethatCame = function (body, companyUser, type) {
  let matchAggregate = { companyId: companyUser.companyId.toString(),
    'datetime': body.days === 'all' ? { $exists: true } : {
      $gte: new Date(
        (new Date().getTime() - (body.days * 24 * 60 * 60 * 1000))),
      $lt: new Date(
        (new Date().getTime()))
    },
    autoposting_type: type
  }
  return {matchAggregate}
}
