
// Get a single verificationtoken
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/verificationtoken/verificationtoken.controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.resend = function (req, res) {
  utility.callApi(`verificationtoken/resend`, 'get', {}, 'accounts', req.headers.authorization)
    .then(response => {
      sendSuccessResponse(res, 200, response)
    })
    .catch(err => {
      const message = err || 'error in calling internal APIs'
      logger.serverLog(message, `${TAG}: exports.callApi`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, 'Internal Server Error ' + err)
    })
}
