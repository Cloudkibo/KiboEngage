const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const { callApi } = require('../utility')

exports.delete = function (req, res) {
  callApi(`overlayWidgets/${req.params.id}`, 'delete', {}, 'accounts', req.headers.authorization)
    .then(deleted => {
      sendSuccessResponse(res, 200, deleted)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Failed to delete overlay widget ${err}`)
    })
}
exports.create = function (req, res) {
  let dataToSave = {
    widgetType: req.body.widgetType,
    companyId: req.user.companyId,
    userId: req.user._id,
    pageId: req.body.pageId,
    isActive: req.body.isActive,
    initialState: req.body.initialState,
    submittedState: req.body.submittedState,
    optInMessage: req.body.optInMessage
  }
  callApi(`overlayWidgets/`, 'post', dataToSave, 'accounts', req.headers.authorization)
    .then(deleted => {
      sendSuccessResponse(res, 200, deleted)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Failed to delete overlay widget ${err}`)
    })
}
