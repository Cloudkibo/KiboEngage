const shopifyWebhook = require('../../v1.1/shopify/webhook.controller')

exports.shopify = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  shopifyWebhook.handleNewCustomerRefId(req.body.entry[0].messaging[0])
}

exports.shopifyNewSubscriber = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  shopifyWebhook.handleNewSubscriber(req.body)
}
