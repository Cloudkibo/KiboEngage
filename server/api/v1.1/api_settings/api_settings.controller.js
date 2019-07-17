const utility = require('../utility')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.index = function (req, res) {
  utility.callApi(`api_settings/`, 'post', {company_id: req.body.company_id})
    .then(settings => {
      sendSuccessResponse(res, 200, settings)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Failed to fetch API settings ${err}`)
    })
}

exports.enable = function (req, res) {
  utility.callApi(`api_settings/enable`, 'post', {company_id: req.body.company_id})
    .then(settings => {
      sendSuccessResponse(res, 200, settings)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Failed to enable API settings ${err}`)
    })
}

exports.disable = function (req, res) {
  utility.callApi(`api_settings/disable`, 'post', {company_id: req.body.company_id})
    .then(settings => {
      sendSuccessResponse(res, 200, settings)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Failed to disable API settings ${err}`)
    })
}

exports.reset = function (req, res) {
  utility.callApi(`api_settings/reset`, 'post', {company_id: req.body.company_id})
    .then(settings => {
      sendSuccessResponse(res, 200, settings)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Failed to reset API settings ${err}`)
    })
}
