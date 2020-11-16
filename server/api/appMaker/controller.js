const logger = require('../../components/logger')
const TAG = 'api/appMaker.js'
const { sendSuccessResponse, sendErrorResponse } = require('../global/response')
const async = require('async')

exports.sendTwilioSMS = function (req, res) {
  console.log(req.body)
  const {accountSid, authToken, message, to, from} = req.body
  const client = require('twilio')(accountSid, authToken)
  async.each(JSON.parse(to), function (number, next) {
    client.messages.create({
      body: message,
      from: from,
      to: number
    }).then(response => next())
      .catch(err => {
        const message = err || 'Failed to send twilio sms'
        logger.serverLog(message, `${TAG}: exports.sendTwilioSMS`, {}, {}, 'error')
        next(err)
      })
  }, function (err) {
    if (err) {
      const message = err || 'Failed to send twilio sms'
      logger.serverLog(message, `${TAG}: exports.sendTwilioSMS`, {}, {}, 'error')
      sendErrorResponse(res, 500, err)
    } else {
      sendSuccessResponse(res, 200, 'Success')
    }
  })
}
