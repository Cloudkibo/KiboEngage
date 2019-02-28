const {callApi} = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/landingPage.controller.js'
const broadcastUtility = require('../broadcasts/broadcasts.utility')
const messengerEventsUtility = require('./utility')

exports.index = function (req, res) {
  console.log('req.body in landingPage', req.body)
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
      console.log('page Found', page)
      callApi(`subscribers/query`, 'post', { pageId: page._id, companyId: page.companyId, senderId: sender })
        .then(subscriber => {
          subscriber = subscriber[0]
          console.log('page._id', page._id)
          callApi(`landingPage/query`, 'post', { pageId: page._id, companyId: page.companyId })
            .then(landingPage => {
              landingPage = landingPage[0]
              if (landingPage.isActive) {
                console.log('landingPage', landingPage)
                broadcastUtility.getBatchData(landingPage.optInMessage, subscriber.senderId, page, messengerEventsUtility.sendBroadcast, subscriber.firstName, subscriber.lastName, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
              }
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to fetch landingPage ${JSON.stringify(err)}`)
            })
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`)
    })
}
