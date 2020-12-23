const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/integrations/integrations.controller.js'

exports.index = function (req, res) {
  callApi(`integrations/query`, 'post', {companyId: req.user.companyId}, 'accounts', req.headers.authorization)
    .then(integrations => {
      sendSuccessResponse(res, 200, integrations)
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.update`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Failed to fetch integrations ${err}`)
    })
}
exports.update = function (req, res) {
  if (!req.body.enabled) {
    req.body.integrationToken = ''
  }
  req.body.userId = req.user._id
  callApi(`integrations/update`, 'put', {query: {_id: req.params.id}, newPayload: req.body, options: {}}, 'accounts', req.headers.authorization)
    .then(integrations => {
      if (!req.body.enabled) {
        updateCompanyUsage(req.user.companyId, 'external_integrations', -1)
      }
      sendSuccessResponse(res, 200, integrations)
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.update`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Failed to update integration ${err}`)
    })
}
