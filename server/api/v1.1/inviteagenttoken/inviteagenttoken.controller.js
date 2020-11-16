'use strict'
// eslint-disable-next-line no-unused-vars
const logger = require('../../../components/logger')
// eslint-disable-next-line no-unused-vars
const TAG = 'api/inviteagenttoken/inviteagenttoken.controller.js'
const callApi = require('../utility')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.verify = function (req, res) {
  callApi.callApi(`invite_verification/${req.params.id}`, 'get', {})
    .then(result => {
      sendSuccessResponse(res, 200, 'Verify Token Success')
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.verify`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
    })
}
