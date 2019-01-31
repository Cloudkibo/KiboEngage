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

exports.queryForSubscribers = function (body, companyUser, isSubscribed) {
  console.log('query for subscribers')
  let query = [
    { $lookup: {from: 'pages', localField: 'pageId', foreignField: '_id', as: 'pageId'} },
    { $unwind: '$pageId' },
    {$match: { companyId: companyUser.companyId,
      'datetime': body.days === 'all' ? { $exists: true } : {
        $gte: new Date(
          (new Date().getTime() - (body.days * 24 * 60 * 60 * 1000))),
        $lt: new Date(
          (new Date().getTime()))
      },
      isSubscribed: isSubscribed,
      pageId: {}
    }
    },
    {$group: {
      _id: null,
      count: {$sum: 1}}
    }
  ]
  if (body.pageId === 'all') {
    query[0].$match.pageId.connected = true
  } else {
    query[0].$match.pageId._id = body.pageId
  }
  console.log('final query', query)
  return query
}

exports.queryForSubscribersGraph = function (body, companyUser, isSubscribed) {
  let query = [
    { $lookup: {from: 'pages', localField: 'pageId', foreignField: '_id', as: 'pageId'} },
    { $unwind: '$pageId' },
    {$match: { companyId: companyUser.companyId,
      'datetime': body.days === 'all' ? { $exists: true } : {
        $gte: new Date(
          (new Date().getTime() - (body.days * 24 * 60 * 60 * 1000))),
        $lt: new Date(
          (new Date().getTime()))
      },
      isSubscribed: isSubscribed
    }
    },
    {$group: {
      _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
      count: {$sum: 1}}
    }
  ]
  if (body.pageId === 'all') {
    query[0].$match.pageId.connected = true
  } else {
    query[0].$match.pageId._id = body.pageId
  }
  return query
}
