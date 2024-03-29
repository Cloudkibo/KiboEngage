const {callApi} = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/messagingreferrals.controller.js'
const broadcastUtility = require('../broadcasts/broadcasts.utility')
const messengerEventsUtility = require('./utility')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  const sender = req.body.senderId
  const pageId = req.body.pageId
  callApi(`pages/query`, 'post', { pageId: pageId, connected: true })
    .then(page => {
      page = page[0]
      callApi(`subscribers/query`, 'post', { pageId: page._id, companyId: page.companyId, senderId: sender, completeInfo: true })
        .then(subscriber => {
          subscriber = subscriber[0]
          callApi(`pageReferrals/query`, 'post', { pageId: page._id, companyId: page.companyId, ref_parameter: req.body.referral.ref })
            .then(pageReferral => {
              pageReferral = pageReferral[0]
              if (pageReferral) {
                broadcastUtility.getBatchData(pageReferral.reply, subscriber.senderId, page, messengerEventsUtility.sendBroadcast, subscriber.firstName, subscriber.lastName, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
              }
            })
            .catch(err => {
              const message = err || 'Failed to fetch page referral'
              logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
            })
          callApi(`messenger_code/query`, 'post', { pageId: page._id, companyId: page.companyId })
            .then(messegerCode => {
              messegerCode = messegerCode[0]
              if (messegerCode) {
                broadcastUtility.getBatchData(messegerCode.optInMessage, subscriber.senderId, page, messengerEventsUtility.sendBroadcast, subscriber.firstName, subscriber.lastName, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
              }
            })
            .catch(err => {
              const message = err || 'Failed to fetch page referral'
              logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
            })
        })
        .catch(err => {
          const message = err || 'Failed to fetch landingPage'
          logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
        })
    })
    .catch(err => {
      const message = err || 'Failed to fetch page'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
    })
}
