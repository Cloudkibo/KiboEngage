const utility = require('../utility')
const needle = require('needle')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const logger = require('../../../components/logger')
const TAG = 'api/webhooks/webhooks.controller.js'

exports.index = function (req, res) {
  utility.callApi(`webhooks/query`, 'post', {companyId: req.user.companyId})
    .then(webhooks => {
      sendSuccessResponse(res, 200, webhooks)
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch webhooks ${JSON.stringify(error)}`)
    })
}
exports.create = function (req, res) {
  utility.callApi(`webhooks/query`, 'post', {companyId: req.user.companyId, pageId: req.body.pageId})
    .then(webhooks => {
      if (webhooks && webhooks.length > 0) {
        sendErrorResponse(res, 403, 'Webhook for this page is already set')
      } else {
        var url = req.body.webhook_url + '?token=' + req.body.token
        needle.get(url, (err, r) => {
          if (err) {
            let errorMsg = 'The URL could not be validated. Callback verification failed with the Status Code = ' + r.statusCode
            sendErrorResponse(res, 400, errorMsg)
          } else {
            if (r.statusCode === 200) {
              let webhookPayload = {
                webhook_url: req.body.webhook_url,
                companyId: req.user.companyId,
                userId: req.user._id,
                isEnabled: true,
                optIn: req.body.optIn,
                pageId: req.body.pageId
              }
              utility.callApi(`webhooks`, 'post', webhookPayload)
                .then(webhook => {
                  sendSuccessResponse(res, 200, webhook)
                })
                .catch(error => {
                  const message = error || 'Internal Server Error'
                  logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
                  sendErrorResponse(res, 500, `Failed to save webhook ${JSON.stringify(error)}`)
                })
            } else {
              let errorMsg = 'The URL could not be validated. Callback verification failed with the Status Code = ' + r.statusCode
              sendErrorResponse(res, 400, errorMsg)
            }
          }
        })
      }
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch webhook ${JSON.stringify(error)}`)
    })
}
exports.edit = function (req, res) {
  var url = req.body.webhook_url + '?token=' + req.body.token
  needle.get(url, (err, r) => {
    console.log('response from url', r.body)
    if (err) {
      let errorMsg = 'The URL could not be validated. Callback verification failed with the Status Code = ' + r.statusCode
      sendErrorResponse(res, 400, errorMsg)
    } else if (r.statusCode === 200) {
      let webhookPayload = {
        webhook_url: req.body.webhook_url,
        optIn: req.body.optIn
      }
      utility.callApi(`webhooks/${req.body._id}`, 'put', webhookPayload)
        .then(webhook => {
          sendSuccessResponse(res, 200, webhook)
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.edit`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to update webhook ${JSON.stringify(error)}`)
        })
    } else {
      let errorMsg = 'The URL could not be validated. Callback verification failed with the Status Code = ' + r.statusCode
      sendErrorResponse(res, 400, errorMsg)
    }
  })
}
exports.enabled = function (req, res) {
  utility.callApi(`webhooks/${req.body._id}`, 'put', {isEnabled: req.body.isEnabled})
    .then(webhook => {
      sendSuccessResponse(res, 200, webhook)
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.enabled`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to update webhook ${JSON.stringify(error)}`)
    })
}
