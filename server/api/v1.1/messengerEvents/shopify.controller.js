const shopifyWebhook = require('../../v1.1/shopify/webhook.controller')
const logger = require('../../../components/logger')
const TAG = 'api/messengerEvents/shopify.controller.js'

exports.shopify = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  logger.serverLog(TAG, `in shopify ${JSON.stringify(req.body)}`)
  shopifyWebhook.handleNewCustomerRefId(req.body.entry[0].messaging[0])
}

exports.shopifyNewSubscriber = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  logger.serverLog(TAG, `in shopify ${JSON.stringify(req.body)}`)
  shopifyWebhook.handleNewSubscriber(req.body)
}
