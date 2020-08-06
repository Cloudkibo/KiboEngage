const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const { callApi } = require('../utility')
const LogicLayer = require('./overlayWidgets.logiclayer.js')
const async = require('async')
const { updateCompanyUsage } = require('../../global/billingPricing')

exports.delete = function (req, res) {
  callApi(`overlayWidgets/${req.params.id}`, 'delete', {}, 'accounts', req.headers.authorization)
    .then(deleted => {
      updateCompanyUsage(req.user.companyId, 'overlay_widgets', -1)
      sendSuccessResponse(res, 200, deleted)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Failed to delete overlay widget ${err}`)
    })
}
exports.create = function (req, res) {
  let dataToSave = {
    title: req.body.title,
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
    .then(result => {
      updateCompanyUsage(req.user.companyId, 'overlay_widgets', 1)
      sendSuccessResponse(res, 200, result)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Failed to create overlay widget ${err}`)
    })
}
exports.fetchWidgets = function (req, res) {
  let criteria = LogicLayer.fetchCriteria(req.body, req.user.companyId)
  async.parallelLimit([
    function (callback) {
      callApi(`overlayWidgets/aggregate`, 'post', criteria.countCriteria, 'accounts', req.headers.authorization)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      callApi(`overlayWidgets/aggregate`, 'post', criteria.finalCriteria, 'accounts', req.headers.authorization)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      sendErrorResponse(res, 500, err)
    } else {
      let countResponse = results[0]
      let overlayWidgets = results[1]
      sendSuccessResponse(res, 200, {overlayWidgets: overlayWidgets, count: countResponse.length > 0 ? countResponse[0].count : 0})
    }
  })
}
exports.update = function (req, res) {
  let updateQuery = {
    query: {
      _id: req.params.id
    },
    newPayload: req.body,
    options: {}
  }
  callApi(`overlayWidgets/update`, 'put', updateQuery, 'accounts', req.headers.authorization)
    .then(updated => {
      sendSuccessResponse(res, 200, updated)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Failed to update overlay widget ${err}`)
    })
}
