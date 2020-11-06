const {callApi} = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/landingPage.controller.js'
const broadcastUtility = require('../broadcasts/broadcasts.utility')
const messengerEventsUtility = require('./utility')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  const sender = req.body.senderId
  const pageId = req.body.pageId
  const companyId = req.body.companyId
  callApi(`pages/query`, 'post', { pageId: pageId, connected: true, companyId })
    .then(page => {
      page = page[0]
      callApi(`subscribers/query`, 'post', { pageId: page._id, companyId: page.companyId, senderId: sender, completeInfo: true })
        .then(subscriber => {
          subscriber = subscriber[0]
          callApi(`landingPage/query`, 'post', { pageId: page._id, companyId: page.companyId })
            .then(landingPage => {
              landingPage = landingPage[0]
              if (landingPage.isActive) {
                broadcastUtility.getBatchData(landingPage.optInMessage, subscriber.senderId, page, messengerEventsUtility.sendBroadcast, subscriber.firstName, subscriber.lastName, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
              }
            })
            .catch(err => {
              const message = err || 'Failed to fetch landingPage'
              logger.serverLog(message, `${TAG}: exports.index`, req.body, {}, 'error')
            })
        })
        .catch(err => {
          const message = err || 'Failed to fetch subscriber'
          logger.serverLog(message, `${TAG}: exports.index`, req.body, {}, 'error')
        })
    })
    .catch(err => {
      const message = err || 'Failed to fetch page'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {}, 'error')
    })
}
