const logger = require('../../../components/logger')
const TAG = 'twilio.controller.js'
const async = require('async')
const config = require('../../../config/environment')
const { callApi } = require('../utility')
const middleware = require('./middleware')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

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
        success++
        cb()
      })
      .catch(error => {
        const message = error || 'error at sending message'
        logger.serverLog(message, `${TAG}: exports.sendSMS`, req.body, {user: req.user}, 'error')
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

exports.verifyNumber = function (req, res) {
  callApi('companyprofile/query', 'post', {_id: req.user.companyId})
    .then(company => {
      if (company) {
        if (company.sms) {
          const twilioClient = require('twilio')(company.sms.accountSID, company.sms.authToken)
          middleware.verifyPhoneNumber(req.body.number, twilioClient)
            .then(valid => {
              sendSuccessResponse(res, 200, null, 'Number is valid')
            })
            .catch(err => {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.verifyNumber`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 403, err, 'Please enter a valid number of format E.164')
            })
        } else {
          sendErrorResponse(res, 404, null, 'Twilio account is not connected on your account. Please connect twilio account to use SMS service.')
        }
      } else {
        sendErrorResponse(res, 404, null, 'User does not belong to any company')
      }
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.verifyNumber`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, null, 'An unexpected error occurred. Please try again later')
    })
}
