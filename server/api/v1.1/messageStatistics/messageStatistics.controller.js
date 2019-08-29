/**
 * Created by sojharo on 24/11/2017.
 */

// eslint-disable-next-line no-unused-vars
const logger = require('../../../components/logger')
// eslint-disable-next-line no-unused-vars
const TAG = 'api/messageStatistics/messageStatistics.controller.js'
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const { getRecords } = require('./../../global/messageStatistics')

exports.index = function (req, res) {
  getRecords((err, data) => {
    if (err) {
      return sendErrorResponse(res, '500', '', err)
    }
    sendSuccessResponse(res, '200', data, '')
  })
}