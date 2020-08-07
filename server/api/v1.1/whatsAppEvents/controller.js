const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = '/api/v1/flockSendEvents/controller.js'
const whatsAppMapper = require('../../../whatsAppMapper/whatsAppMapper')

exports.messageStatus = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  whatsAppMapper.handleInboundMessageStatus(req.body.provider, req.body.event)
    .then(data => {
      if (data.status === 'delivered' || data.status === 'seen') {
        let query = {
          purpose: 'findOne',
          match: { messageId: data.messageId }
        }
        callApi(`whatsAppBroadcastMessages/query`, 'post', query, 'kiboengage')
          .then(message => {
            if (message) {
              updateCount(message, data)
            } else {
              callApi(`queue`, 'post', { platform: 'whatsApp', payload: data }, 'kiboengage')
                .then(queue => {
                })
                .catch((err) => {
                  logger.serverLog(`Failed to create queue ${err}`, 'error')
                })
            }
          })
          .catch((err) => {
            logger.serverLog(TAG, `Failed to fetch whatsAppBroadcastMessages data ${err}`, 'error')
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to map whatsapp message status data ${JSON.stringify(req.body)} ${JSON.stringify(err)}`, 'error')
    })
}
function updateCount (message, body) {
  let updateData = {
    purpose: 'updateOne',
    match: { _id: message._id },
    updated: body.status === 'delivered' ? { delivered: true } : { seen: true }
  }
  callApi(`whatsAppBroadcastMessages`, 'put', updateData, 'kiboengage')
    .then(message => {
    })
    .catch((err) => {
      logger.serverLog(`Failed to update message ${err}`, 'error')
    })
  let broadcastCountUpdate = {
    purpose: 'updateOne',
    match: { _id: message.broadcastId },
    updated: body.status === 'delivered'
      ? { $inc: { delivered: 1 } } : { $inc: { seen: 1 } }
  }
  callApi(`whatsAppBroadcasts`, 'put', broadcastCountUpdate, 'kiboengage')
    .then(broadcast => {
    })
    .catch((err) => {
      logger.serverLog(`Failed to update broadcast ${err}`, 'error')
    })
}

exports.updateCount = updateCount
