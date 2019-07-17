const AutomationQueue = require('./automationQueue.datalayer')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.index = function (req, res) {
  AutomationQueue.findAllAutomationQueueObjectsUsingQuery({ companyId: req.body.companyId })
    .then(automationQueue => {
      if (!automationQueue) {
        sendErrorResponse(res, 404, '', 'Automation Queue is empty for this company. Please contact support')
      }
      sendSuccessResponse(res, 200, automationQueue)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Internal Server Error in fetching automation queues against companyId${JSON.stringify(err)}`)
    })
}

exports.create = function (req, res) {
  AutomationQueue.createAutomationQueueObject(req.body.payload)
    .then(result => {
      sendSuccessResponse(res, 200, result)
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}
