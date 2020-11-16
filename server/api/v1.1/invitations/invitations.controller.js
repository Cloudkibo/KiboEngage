
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
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
    })
}

exports.cancel = function (req, res) {
  callApi.callApi('invitations/cancel', 'post', {email: req.body.email}, 'accounts', req.headers.authorization)
    .then(result => {
      sendSuccessResponse(res, 200, '', 'Invitation has been cancelled.')
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.cancel`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
    })
}

exports.invite = function (req, res) {
  callApi.callApi('companyprofile/invite', 'post', {email: req.body.email, name: req.body.name})
    .then((result) => {
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.invite`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err)
    })
}
