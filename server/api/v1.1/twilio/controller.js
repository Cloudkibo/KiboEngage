const logger = require('../../../components/logger')
const TAG = 'smsBroadcasts.controller.js'
const async = require('async')
const config = require('../../../config/environment')

exports.sendSMS = function (req, res) {
  const numbers = req.body.numbers
  const from = config.twilio.number
  let success = 0
  let failed = 0
  async.each(numbers, function (number, cb) {
    // map code to template
    req.twilioClient.messages
      .create({
        body: 'template',
        from,
        to: number
      })
      .then(response => {
        logger.serverLog(TAG, `response from twilio ${JSON.stringify(response)}`)
        success++
        cb()
      })
      .catch(error => {
        logger.serverLog(TAG, `error at sending message ${error}`, 'error')
        failed++
        cb()
      })
  }, function () {
    return res.status(201).json({status: 'success', payload: {success, failed}})
  })
}

exports.receiveSMS = function (req, res) {
  // const client = require('twilio')(config.twilio.sid, config.twilio.token)
  // map response to template and call lab work api
  return res.status(200).json({status: 'success'})
}
