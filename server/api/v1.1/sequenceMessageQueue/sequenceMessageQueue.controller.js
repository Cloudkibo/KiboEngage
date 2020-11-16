const logger = require('../../../components/logger')
const SequenceMessageQueue = require('./sequenceMessageQueue.datalayer')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const TAG = 'api/SequenceMessageQueue/SequenceMessageQueue.controller.js'

exports.index = function (req, res) {
  SequenceMessageQueue.genericFind({ subscriberId: req.body.subscriberId })
    .then(sequenceQueue => {
      if (!sequenceQueue) {
        sendErrorResponse(res, 404, '', 'Automation Queue is empty for this company. Please contact support')
      }
      sendSuccessResponse(res, 200, sequenceQueue)
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
    })
}
