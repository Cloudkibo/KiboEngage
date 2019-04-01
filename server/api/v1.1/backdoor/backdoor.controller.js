const LogicLayer = require('./logiclayer')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/messengerEvents/delivery.controller'
const sortBy = require('sort-array')
const DataLayer = require('./datalayer')
const BroadcastPageDataLayer = require('../page_broadcast/page_broadcast.datalayer')

exports.getAllUsers = function (req, res) {
  console.log('in getAllUsers')
  let criterias = LogicLayer.getCriterias(req.body)
  utility.callApi(`user/query`, 'post', criterias.findCriteria, req.headers.authorization)
    .then(usersData => {
      utility.callApi(`user/aggregate`, 'post', criterias.finalCriteria, req.headers.authorization)
        .then(users => {
          console.log('users fetched', users.length)
          let usersPayload = []
          if (users.length > 0) {
            users.forEach((user) => {
              let pageIds = []
              utility.callApi(`pages/query`, 'post', {userId: user._id, connected: true}, req.headers.authorization)
                .then(pages => {
                  console.log('pages fetched in', pages)
                  for (let i = 0; i < pages.length; i++) {
                    pageIds.push(pages[i]._id)
                  }
                  utility.callApi(`subscribers/query`, 'post', {pageId: pageIds, isSubscribed: true, isEnabledByPage: true}, req.headers.authorization)
                    .then(subscribers => {
                      console.log('subscribers fetched in', subscribers)
                      usersPayload.push({
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        facebookInfo: user.facebookInfo ? user.facebookInfo : null,
                        createdAt: user.createdAt,
                        pages: pages.length,
                        subscribers: subscribers.length
                      })
                      if (usersPayload.length === users.length) {
                        let sorted = sortBy(usersPayload, 'createdAt')
                        console.log('sorted.length', sorted.length)
                        res.status(200).json({
                          status: 'success',
                          payload: {users: sorted.reverse(), count: usersData.length}
                        })
                      }
                    })
                    .catch(error => {
                      logger.serverLog(TAG, `ERROR in fetching subscribers ${JSON.stringify(error)}`)
                    })
                })
                .catch(error => {
                  logger.serverLog(TAG, `ERROR in fetching pages ${JSON.stringify(error)}`)
                })
            })
          } else {
            res.status(200).json({
              status: 'success',
              payload: {users: [], count: usersData.length}
            })
          }
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch users aggregate ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch users ${JSON.stringify(error)}`})
    })
}
exports.getAllPages = function (req, res) {
  let criterias = LogicLayer.getAllPagesCriteria(req.params.userid, req.body)
  console.log('criterias.countCriteria', JSON.stringify(criterias.countCriteria))
  console.log('criterias.finalCriteria', JSON.stringify(criterias.finalCriteria))
  utility.callApi(`pages/aggregate`, 'post', criterias.countCriteria, req.headers.authorization) // fetch connected pages count
    .then(count => {
      console.log('pagesCount', count)
      utility.callApi(`pages/aggregate`, 'post', criterias.finalCriteria, req.headers.authorization) // fetch connected pages
        .then(pages => {
          console.log('fetched pages', pages)
          let pagesPayload = []
          for (let i = 0; i < pages.length; i++) {
            pagesPayload.push({
              _id: pages[i]._id,
              pageId: pages[i].pageId,
              pageName: pages[i].pageName,
              userId: pages[i].userId,
              pagePic: pages[i].pagePic,
              connected: pages[i].connected,
              pageUserName: pages[i].pageUserName,
              likes: pages[i].likes,
              subscribers: pages[i].subscribers.length
            })
          }
          res.status(200).json({
            status: 'success',
            payload: {pages: pagesPayload, count: pagesPayload.length > 0 ? count[0].count : ''}
          })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch pages ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch pages count ${JSON.stringify(error)}`})
    })
}
exports.allLocales = function (req, res) {
  utility.callApi(`user/distinct`, 'post', {distinct: 'facebookInfo.locale'}, req.headers.authorization)
    .then(locales => {
      res.status(200).json({
        status: 'success',
        payload: locales
      })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch locales ${JSON.stringify(error)}`})
    })
}
exports.allUserBroadcasts = function (req, res) {
  let criteria = LogicLayer.allUserBroadcastsCriteria(req.params.userid, req.body)
  DataLayer.countBroadcasts(criteria.countCriteria[0].$match)
    .then(broadcastsCount => {
      let aggregateMatch = criteria.finalCriteria[0].$match
      let aggregateSort = criteria.finalCriteria[1].$sort
      let aggregateSkip = criteria.finalCriteria[2].$skip
      let aggregateLimit = criteria.finalCriteria[3].$limit
      DataLayer.aggregateForBroadcasts(aggregateMatch, undefined, undefined, aggregateLimit, aggregateSort, aggregateSkip)
        .then(broadcasts => {
          res.status(200).json({
            status: 'success',
            payload: {broadcasts: broadcasts, count: broadcasts.length > 0 ? broadcastsCount[0].count : ''}
          })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch broadcasts ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch broadcasts count ${JSON.stringify(error)}`})
    })
}
exports.getAllBroadcasts = function (req, res) {
  let criteria = LogicLayer.getAllBroadcastsCriteria(req.body)
  DataLayer.countBroadcasts(criteria.countCriteria[0].$match)
    .then(broadcastsCount => {
      console.log('broadcastsCount fetched', broadcastsCount)
      let aggregateLookup = criteria.finalCriteria[0].$lookup
      let aggregateMatch = criteria.finalCriteria[1].$match
      let aggregateSort = criteria.finalCriteria[2].$sort
      let aggregateSkip = criteria.finalCriteria[3].$skip
      let aggregateLimit = criteria.finalCriteria[4].$limit
      DataLayer.aggregateForBroadcasts(aggregateMatch, undefined, aggregateLookup, aggregateLimit, aggregateSort, aggregateSkip)
        .then(broadcasts => {
          console.log('broadcasts fetched inn', broadcasts[0])
          let temp = []
          let tempUser = []
          let tempCompany = []
          for (let i = 0; i < broadcasts.length; i++) {
            temp.push(broadcasts[i]._id)
            tempUser.push(broadcasts[i].userId)
            tempCompany.push(broadcasts[i].companyId)
          }
          BroadcastPageDataLayer.genericFind({broadcastId: {$in: temp}})
            .then(broadcastpages => {
              // utility.callApi(`user/query`, 'post', {_id: {$in: tempUser}}, req.headers.authorization)
              //   .then(users => {
                  // utility.callApi(`companyprofile/query`, 'post', {findAll: true, _id: {$in: tempCompany}}, req.headers.authorization)
                  //   .then(companies => {
                      prepareDataToSend(broadcasts, req)
                      .then(result => {
                        console.log('data fetched', result)
                      return res.status(200)
                        .json({
                          status: 'success',
                          payload: {broadcasts: result.data, count: result.data.length > 0 ? broadcastsCount[0].count : ''}
                        })
                      })
                    // })
                    // .catch(error => {
                    //   return res.status(500).json({status: 'failed', payload: `Failed to fetch company profiles ${JSON.stringify(error)}`})
                    // })
                // })
                // .catch(error => {
                //   return res.status(500).json({status: 'failed', payload: `Failed to fetch users ${JSON.stringify(error)}`})
                // })
            })
            .catch(error => {
              return res.status(500).json({status: 'failed', payload: `Failed to fetch broadcast pages ${JSON.stringify(error)}`})
            })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch broadcasts ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch broadcasts count ${JSON.stringify(error)}`})
    })
}

function prepareDataToSend (broadcasts, req) {
  return new Promise(function (resolve, reject) {
    let data = []
    for (let j = 0; j < broadcasts.length; j++) {
      let pagebroadcastTapped = broadcasts[j].broadcastPages.filter((c) => c.seen === true)
      utility.callApi(`user/query`, 'post', {_id: broadcasts[j].userId}, req.headers.authorization)
        .then(user => {
          utility.callApi(`pages/query`, 'post', {companyId: broadcasts[j].companyId}, req.headers.authorization)
            .then(pages => {
              console.log('pages fetched in', pages.length)
              let pageSend = []
              if (pages.length > 0) {
                if (broadcasts[j].segmentationPageIds && broadcasts[j].segmentationPageIds.length > 0) {
                  for (let k = 0; k < broadcasts[j].segmentationPageIds.length; k++) {
                    // segmentationPageIds are actually local Ids, so we should compare using _id
                    // in place of pageId
                    let page = pages.filter((c) => JSON.stringify(c._id) === JSON.stringify(broadcasts[j].segmentationPageIds[k]))
                    pageSend.push(page[0].pageName)
                  }
                } else {
                  let page = pages.filter((c) => c.connected === true)
                  for (let a = 0; a < page.length; a++) {
                    pageSend.push(page[a].pageName)
                  }
                }
              }
              console.log('pageSend value', pageSend)
              data.push({_id: broadcasts[j]._id,
                title: broadcasts[j].title,
                datetime: broadcasts[j].datetime,
                payload: broadcasts[j].payload,
                page: pageSend,
                user: user[0],
                sent: broadcasts[j].broadcastPages.length,
                seen: pagebroadcastTapped.length
              }) // total tapped
              console.log('data value', data)
              if (data.length === broadcasts.length) {
                resolve({data: data})
              }
            })
        })
    }
  })
}
exports.broadcastsGraph = function (req, res) {
  var days = 0
  if (req.params.days === '0') {
    days = 10
  } else {
    days = req.params.days
  }
  let startDate = new Date() // Current date
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0) // Set the hour, minute and second components to 0
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let aggregateMatch = {
    'datetime': {$gte: startDate}
  }
  let aggregateGroup = {
    _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
    count: {$sum: 1}}
  DataLayer.aggregateForBroadcasts(aggregateMatch, aggregateGroup, undefined, undefined, undefined, undefined)
    .then(broadcastsgraphdata => {
      return res.status(200)
        .json({status: 'success', payload: {broadcastsgraphdata}})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch broadcasts ${JSON.stringify(error)}`})
    })
}
exports.sessionsGraph = function (req, res) {
  var days = 0
  if (req.params.days === '0') {
    days = 10
  } else {
    days = req.params.days
  }
  let startDate = new Date() // Current date
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0) // Set the hour, minute and second components to 0
  startDate.setMinutes(0)
  startDate.setSeconds(0)
  let body = [
    {
      $match: {'datetime': {$gte: startDate}}
    },
    {
      $group: {
        _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
        count: {$sum: 1}}
    }]
  utility.callApi(`subscribers/aggregate`, 'post', body, req.headers.authorization)
    .then(sessionsgraphdata => {
      return res.status(200)
        .json({status: 'success', payload: {sessionsgraphdata}})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch sessions ${JSON.stringify(error)}`})
    })
}
exports.getAllSubscribers = function (req, res) {
  let criteria = LogicLayer.getAllSubscribersCriteria(req.params.pageid, req.body)
  utility.callApi(`subscribers/aggregate`, 'post', criteria.countCriteria, req.headers.authorization)
    .then(subscribersCount => {
      utility.callApi(`subscribers/aggregate`, 'post', criteria.finalCriteria, req.headers.authorization)
        .then(subscribers => {
          res.status(200).json({
            status: 'success',
            payload: {subscribers: subscribers, count: subscribers.length > 0 ? subscribersCount[0].count : ''}
          })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch subscribers ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch subscribers count ${JSON.stringify(error)}`})
    })
}
