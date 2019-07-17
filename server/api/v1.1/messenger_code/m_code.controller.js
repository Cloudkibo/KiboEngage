const logger = require('../../../components/logger')
const TAG = 'api/menu/menu.controller.js'
const callApi = require('../utility')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const util = require('util')

exports.index = function (req, res) {
  logger.serverLog(TAG, `Going to call accounts for code ${util.inspect(req.body)}`, 'debug')
  callApi.callApi('messenger_code', 'post', req.body)
    .then(codeUrl => {
      logger.serverLog(TAG, `Got the following URL ${util.inspect(codeUrl)}`, 'debug')
      sendSuccessResponse(res, 200, codeUrl)
    })
    .catch(err => {
      sendErrorResponse(res, 500, `Internal Server Error ${JSON.stringify(err)}`)
    })
}
