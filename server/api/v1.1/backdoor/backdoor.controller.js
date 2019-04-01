const LogicLayer = require('./logiclayer')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/messengerEvents/delivery.controller'
const sortBy = require('sort-array')

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
