const RssFeedPostSubscribersDataLayer = require('./../newsSections/newsPostSubscribers.datalayer')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/clickedCount/clickedCount.controller.js'

exports.updateClickedCount = function (req, res) {
  if (!req.headers['user-agent'].startsWith('facebook')) {
    if (req.query.m === 'rss') {
      console.log('req.query', req.query)
      RssFeedPostSubscribersDataLayer.genericUpdate({newsPostId: req.query.id, subscriberId: req.query.sId}, {clicked: true}, {})
        .then(updatedData => {
          res.writeHead(301, {Location: req.query.r})
          res.end()
        })
        .catch(err => {
          const message = err || 'Failed to fetch update clicks for rss'
          logger.serverLog(message, `${TAG}: exports.updateClickedCount`, req.body, {}, 'error')
        })
    }
  }
}
