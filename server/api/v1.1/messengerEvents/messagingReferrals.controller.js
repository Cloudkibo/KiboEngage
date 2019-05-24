const {callApi} = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/messagingreferrals.controller.js'
const broadcastUtility = require('../broadcasts/broadcasts.utility')
const messengerEventsUtility = require('./utility')

exports.index = function (req, res) {
  console.log('req.body in messagingreferrals', req.body)
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  const sender = req.body.senderId
  const pageId = req.body.pageId
  callApi(`pages/query`, 'post', { pageId: pageId, connected: true })
    .then(page => {
      page = page[0]
      console.log('page Found in messaging', page)
      callApi(`subscribers/query`, 'post', { pageId: page._id, companyId: page.companyId, senderId: sender })
        .then(subscriber => {
          subscriber = subscriber[0]
          callApi(`pageReferrals/query`, 'post', { pageId: page._id, companyId: page.companyId, ref_parameter: req.body.referral.ref })
            .then(pageReferral => {
              pageReferral = pageReferral[0]
              console.log('page referral', pageReferral)
              broadcastUtility.getBatchData(pageReferral.reply, subscriber.senderId, page, messengerEventsUtility.sendBroadcast, subscriber.firstName, subscriber.lastName, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to fetch page referral ${JSON.stringify(err)}`, 'error')
            })
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(err)}`, 'error')
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`, 'error')
    })
}
