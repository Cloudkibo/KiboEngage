const logger = require('../../../components/logger')
const TAG = '/api/v1/twilioEvents/controller.js'
const { callApi } = require('../utility')

exports.trackDeliverySms = function (req, res) {
  res.status(200).json({ status: 'success' })
  if (req.body.MessageStatus === 'delivered') {
    let query = {
      purpose: 'updateOne',
      match: {_id: req.params.id},
      updated: {$inc: { delivered: 1 }}
    }
    callApi(`smsBroadcasts`, 'put', query, 'kiboengage')
      .then(updated => {
        require('./../../../config/socketio').sendMessageToClient({
          room_id: req.user.companyId,
          body: {
            action: 'sms_broadcast_delivery',
            payload: {
              broadcastId: req.params.id
            }
          }
        })
      })
      .catch(err => {
        const message = err || 'Failed to update sms broadcast'
        logger.serverLog(message, `${TAG}: exports.trackDeliverySms`, req.body, {}, 'error')
      })
  }
}
