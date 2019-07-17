const utility = require('../utility')
const broadcastDataLayer = require('../whatsAppBroadcasts/whatsAppBroadcasts.datalayer')
const LogicLayer = require('./whatsAppDashboard.logiclayer')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      let aggregateQuery = [
        { $match: { companyId: companyuser.companyId, isSubscribed: true } },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]
      utility.callApi(`whatsAppContacts/aggregate`, 'post', aggregateQuery) // fetch subscribers count
        .then(contacts => {
          broadcastDataLayer.countBroadcasts({ companyId: companyuser.companyId })
            .then(broadcasts => {
              res.status(200).json({
                status: 'success',
                payload: {subscribers: contacts.length > 0 ? contacts[0].count : 0,
                  broadcasts: broadcasts.length > 0 ? broadcasts[0].count : 0}
              })
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to broadcast count ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch subscriber count ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}
exports.subscriberSummary = function (req, res) {
  utility.callApi('companyUser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      utility.callApi('whatsAppContacts/aggregate', 'post', LogicLayer.queryForSubscribers(req.body, companyUser, true))
        .then(subscribers => {
          utility.callApi('whatsAppContacts/aggregate', 'post', LogicLayer.queryForSubscribers(req.body, companyUser, false))
            .then(unsubscribes => {
              utility.callApi('whatsAppContacts/aggregate', 'post', LogicLayer.queryForSubscribersGraph(req.body, companyUser))
                .then(graphdata => {
                  let data = {
                    subscribes: subscribers.length > 0 ? subscribers[0].count : 0,
                    unsubscribes: unsubscribes.length > 0 ? unsubscribes[0].count : 0,
                    graphdata: graphdata
                  }
                  return res.status(200).json({
                    status: 'success',
                    payload: data
                  })
                })
                .catch(err => {
                  return res.status(500).json({
                    status: 'failed',
                    description: `Error in getting graphdata ${JSON.stringify(err)}`
                  })
                })
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `Error in getting unsubscribers ${JSON.stringify(err)}`
              })
            })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Error in getting subscribers ${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    })
}
exports.sentSeen = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      let aggregateForSent = { _id: null, sent: { $sum: '$sent' }, seen: { $sum: '$seen' } }
      let aggregateForGraph = {
        _id: {'year': {$year: '$datetime'}, 'month': {$month: '$datetime'}, 'day': {$dayOfMonth: '$datetime'}},
        count: {$sum: 1}
      }
      let matchCriteria = LogicLayer.queryForSentSeen(req.body, companyuser)
      broadcastDataLayer.aggregateForBroadcasts(matchCriteria, aggregateForSent)
        .then(broadcasts => {
          broadcastDataLayer.aggregateForBroadcasts(matchCriteria, aggregateForGraph)
            .then(graphdata => {
              res.status(200).json({
                status: 'success',
                payload: {broadcastsSent: broadcasts.length > 0 ? broadcasts[0].sent : 0,
                  broadcastsSeen: broadcasts.length > 0 ? broadcasts[0].seen : 0,
                  graphdata: graphdata }
              })
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch graph ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to broadcast count ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}
