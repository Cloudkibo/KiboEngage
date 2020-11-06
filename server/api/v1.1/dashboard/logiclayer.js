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
      completeInfo: true,
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
      completeInfo: true,
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
    },
     {$sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }}
  ]
  return query
}
exports.getCriteriasForAutopostingByType = function (req) {
  let matchAggregate = { companyId: req.user.companyId,
    'datetime': req.body.days === 'all' ? { $exists: true } : {
      $gte: new Date(
        (new Date().getTime() - (req.body.days * 24 * 60 * 60 * 1000))),
      $lt: new Date(
        (new Date().getTime()))
    }
  }
  return matchAggregate
}
exports.getFbPostsCriteria = function (req) {
  let criteria = {
    purpose: 'aggregate',
    match: {
      companyId: req.user.companyId,
      'datetime': req.body.days === 'all' ? { $exists: true } : {
        $gte: new Date(
          (new Date().getTime() - (req.body.days * 24 * 60 * 60 * 1000))),
        $lt: new Date(
          (new Date().getTime()))
      }
    },
    group: {_id: null, count: {$sum: 1}, likes: {$sum: '$likes'}, comments: {$sum: '$comments'}}
  }
  return criteria
}
exports.getCriteriasForAutopostingByTypethatCame = function (req, type) {
  let matchAggregate = { companyId: req.user.companyId,
    'datetime': req.body.days === 'all' ? { $exists: true } : {
      $gte: new Date(
        (new Date().getTime() - (req.body.days * 24 * 60 * 60 * 1000))),
      $lt: new Date(
        (new Date().getTime()))
    },
    autoposting_type: type
  }
  return matchAggregate
}
exports.getCriteriasForNewsSections = function (req, type) {
  let matchAggregate = {
    companyId: req.user.companyId,
    'datetime': req.body.days === 'all' ? { $exists: true } : {
      $gte: new Date(
        (new Date().getTime() - (req.body.days * 24 * 60 * 60 * 1000))),
      $lt: new Date(
        (new Date().getTime()))
    }
  }
  if (type === 'news') {
    matchAggregate.pageIds = req.body.pageId !== 'all' ? req.body.pageId : {$exists: true}
  } else {
    matchAggregate.pageId = req.body.pageId !== 'all' ? req.body.pageId : {$exists: true}
    if (type === 'seen') {
      matchAggregate.seen = true
    } else if (type === 'sent') {
      matchAggregate.sent = true
    } else if (type === 'clicked') {
      matchAggregate.clicked = true
    }
  }
  return matchAggregate
}
