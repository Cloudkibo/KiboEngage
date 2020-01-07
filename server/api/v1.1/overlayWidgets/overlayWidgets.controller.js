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
