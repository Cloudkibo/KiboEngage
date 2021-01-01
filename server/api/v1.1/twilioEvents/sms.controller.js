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
        callApi(`smsBroadcasts/query`, 'post', {purpose: 'findOne', match: {_id: req.params.id}}, 'kiboengage')
          .then(broadcast => {
            if (broadcast) {
              require('./../../../config/socketio').sendMessageToClient({
                room_id: broadcast.companyId,
                body: {
                  action: 'sms_broadcast_delivery',
                  payload: {
                    broadcast: broadcast
                  }
                }
              })
            }
          })
          .catch(err => {
            const message = err || 'Failed to fetch sms broadcast'
            logger.serverLog(message, `${TAG}: exports.trackDeliverySms`, req.body, {}, 'error')
          })
      })
      .catch(err => {
        const message = err || 'Failed to update sms broadcast'
        logger.serverLog(message, `${TAG}: exports.trackDeliverySms`, req.body, {}, 'error')
      })
  }
}
