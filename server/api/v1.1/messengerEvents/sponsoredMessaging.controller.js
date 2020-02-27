const sponsoredMessagingWebhook = require('../../v1.1/sponsoredMessaging/webhook.controller')
const logger = require('../../../components/logger')
const TAG = 'api/messengerEvents/sponsoredMessaging.controller.js'

exports.sponsoredMessagingController = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  logger.serverLog(TAG, `in sponsored messaging ad status ${JSON.stringify(req.body)}`)
  sponsoredMessagingWebhook.handleAdAccountStatus(req.body.entry[0].changes[0])
}
