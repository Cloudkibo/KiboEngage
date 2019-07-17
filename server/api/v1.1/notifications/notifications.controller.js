const LogicLayer = require('./notifications.logiclayer')
const { callApi } = require('../utility')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.index = function (req, res) {
  let notificationsData = LogicLayer.getQueryData('', 'findAll', {agentId: req.user._id, companyId: req.user.companyId})
  callApi(`notifications/query`, 'post', notificationsData, 'kiboengage')
    .then(notifications => {
      sendSuccessResponse(res, 200, {notifications: notifications})
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch notifications ${JSON.stringify(error)}`)
    })
}
exports.create = function (req, res) {
  req.body.agentIds.forEach((agentId, i) => {
    let notificationsData = {
      message: req.body.message,
      category: req.body.category,
      agentId: agentId,
      companyId: req.body.companyId
    }
    callApi(`notifications`, 'post', notificationsData, 'kiboengage')
      .then(savedNotification => {
        if (i === (req.body.agentIds.length - 1)) {
          sendSuccessResponse(res, 200, savedNotification)
        }
      })
      .catch(error => {
        sendErrorResponse(res, 500, `Failed to create notification ${JSON.stringify(error)}`)
      })
  })
}
exports.markRead = function (req, res) {
  let notificationUpdateData = LogicLayer.getUpdateData('updateOne', {_id: req.body.notificationId}, {seen: true})
  callApi(`notifications`, 'put', notificationUpdateData, 'kiboengage')
    .then(updated => {
      sendSuccessResponse(res, 200, updated)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to update notification ${JSON.stringify(error)}`)
    })
}
