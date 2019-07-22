
const logger = require('../../../components/logger')
const TAG = 'api/invitations/invitations.controller.js'
const callApi = require('../utility')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.index = function (req, res) {
  callApi.callApi('invitations', 'get', {}, 'accounts', req.headers.authorization)
    .then(invitations => {
      sendSuccessResponse(res, 200, invitations)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
    })
}

exports.cancel = function (req, res) {
  callApi.callApi('invitations/cancel', 'post', {email: req.body.email}, 'accounts', req.headers.authorization)
    .then(result => {
      sendErrorResponse(res, 200, '', 'Invitation has been cancelled.')
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
    })
}

exports.invite = function (req, res) {
  callApi.callApi('companyprofile/invite', 'post', {email: req.body.email, name: req.body.name})
    .then((result) => {
      logger.serverLog(TAG, 'result from invite endpoint accounts', 'debug')
      logger.serverLog(TAG, result, 'debug')
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      logger.serverLog(TAG, 'result from invite endpoint accounts', 'debug')
      logger.serverLog(TAG, err, 'debug')
      sendErrorResponse(res, 500, err)
    })
}
