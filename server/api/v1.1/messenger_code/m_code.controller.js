const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const qrcode = require('qrcode')
const utility = require('../utility')
const logicLayer = require('./m_code.logiclayer')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      utility.callApi(`messenger_code/query`, 'post', {companyId: companyUser.companyId})
        .then(messengerCodes => {
          sendSuccessResponse(res, 200, messengerCodes)
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch messenger codes ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.getQRCode = function (req, res) {
  qrcode.toDataURL(`https://m.me/${req.params.pageId}?ref=QRCode`)
    .then(response => {
      sendSuccessResponse(res, 200, response)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to get QRCode ${JSON.stringify(error)}`)
    })
}
exports.delete = function (req, res) {
  utility.callApi(`messenger_code/${req.params.id}`, 'delete', {})
    .then(result => {
      sendSuccessResponse(res, 200, result)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to delete messenger codes ${JSON.stringify(error)}`)
    })
}
exports.create = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      utility.callApi(`messenger_code`, 'post', logicLayer.createPayload(companyUser, req.body))
        .then(created => {
          sendSuccessResponse(res, 200, created)
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to create messenger codes ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.update = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      utility.callApi(`messenger_code/${req.params._id}`, 'put', req.body)
        .then(updatedPageReferral => {
          sendSuccessResponse(res, 200, updatedPageReferral)
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to update messenger codes ${JSON.stringify(error)}`)
        })
    })
}
