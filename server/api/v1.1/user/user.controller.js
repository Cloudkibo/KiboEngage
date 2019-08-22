const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v2/user/user.controller.js'
const util = require('util')
const needle = require('needle')
const config = require('./../../../config/environment/index')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
let { sendOpAlert } = require('./../../global/operationalAlert')

exports.index = function (req, res) {
  utility.callApi(`user`, 'get', {}, 'accounts', req.headers.authorization)
    .then(user => {
      sendSuccessResponse(res, 200, user)
    }).catch(error => {
      logger.serverLog(TAG, `Error while fetching user details ${util.inspect(error)}`, 'error')
      sendErrorResponse(res, 500, `Failed to fetching user details ${JSON.stringify(error)}`)
    })
}

exports.updateChecks = function (req, res) {
  utility.callApi(`user/updateChecks`, 'post', req.body, 'accounts', req.headers.authorization) // call updateChecks in accounts
    .then(user => {
      sendSuccessResponse(res, 200, user)
    }).catch(error => {
      logger.serverLog(TAG, `Error while updating checks ${util.inspect(error)}`, 'error')
      sendErrorResponse(res, 500, `Failed to update checks ${JSON.stringify(error)}`)
    })
}

exports.updateSkipConnect = function (req, res) {
  utility.callApi(`user/updateSkipConnect`, 'get', 'accounts', req.headers.authorization)
    .then(user => {
      sendSuccessResponse(res, 200, user)
    }).catch(error => {
      logger.serverLog(TAG, `Error at updateSkipConnect  ${util.inspect(error)}`, 'error')
      sendErrorResponse(res, 500, `Failed to updateSkipConnect ${JSON.stringify(error)}`)
    })
}

exports.updateMode = function (req, res) {
  utility.callApi(`user/updateMode`, 'post', req.body, 'accounts', req.headers.authorization)
    .then(user => {
      sendSuccessResponse(res, 200, user)
    }).catch(error => {
      logger.serverLog(TAG, `Error while updating mode ${util.inspect(error)}`, 'error')
      sendErrorResponse(res, 500, `Failed to update mode ${JSON.stringify(error)}`)
    })
}

exports.fbAppId = function (req, res) {
  // utility.callApi(`user/fbAppId`, 'get', {})
  //   .then(facebookClientId => {
  //     return res.status(200).json({
  //       status: 'success',
  //       payload: facebookClientId
  //     })
  //   }).catch(error => {
  //     logger.serverLog(TAG, `Error while getting fbAppId ${util.inspect(error)}`, 'error')
  //     return res.status(500).json({
  //       status: 'failed',
  //       payload: `Failed to fetch fbAppId ${JSON.stringify(error)}`
  //     })
  //   })
  sendSuccessResponse(res, 200, config.facebook.clientID)
}

exports.authenticatePassword = function (req, res) {
  utility.callApi(`user/authenticatePassword`, 'post', req.body, 'accounts', req.headers.authorization)
    .then(status => {
      sendSuccessResponse(res, 200, status)
    }).catch(error => {
      logger.serverLog(TAG, `Error while authenticating password ${util.inspect(error)}`, 'error')
      sendErrorResponse(res, 500, `Failed to authenticate password ${JSON.stringify(error)}`)
    })
}

exports.addAccountType = function (req, res) {
  utility.callApi(`user/addAccountType`, 'get', {}, 'accounts', req.headers.authorization)
    .then(status => {
      sendSuccessResponse(res, 200, status)
    }).catch(error => {
      logger.serverLog(TAG, `Error while adding account type ${util.inspect(error)}`, 'error')
      sendErrorResponse(res, 500, `Failed to add account type ${JSON.stringify(error)}`)
    })
}

exports.enableDelete = function (req, res) {
  utility.callApi(`user/gdpr`, 'post', req.body, 'accounts', req.headers.authorization)
    .then(updatedUser => {
      sendSuccessResponse(res, 200, updatedUser)
    }).catch(error => {
      logger.serverLog(TAG, `Error while enabling GDPR delete ${util.inspect(error)}`, 'error')
      sendErrorResponse(res, 500, `Failed to enable GDPR delete ${JSON.stringify(error)}`)
    })
}

exports.cancelDeletion = function (req, res) {
  utility.callApi(`user/gdpr`, 'get', {}, 'accounts', req.headers.authorization)
    .then(updatedUser => {
      sendSuccessResponse(res, 200, updatedUser)
    }).catch(error => {
      logger.serverLog(TAG, `Error while disabling GDPR delete ${util.inspect(error)}`, 'error')
      sendErrorResponse(res, 500, `Failed to disable GDPR delete ${JSON.stringify(error)}`)
    })
}

exports.validateUserAccessToken = function (req, res) {
  if (req.user.facebookInfo) {
    needle.get(`https://graph.facebook.com/v2.6/me?access_token=${req.user.facebookInfo.fbToken}`, (err, response) => {
      if (err) {
        sendErrorResponse(res, 500, JSON.stringify(err))
      } else if (response.body.error) {
        sendOpAlert(response.body.error, 'user controller in kiboengage')
        sendErrorResponse(res, 500, response.body)
      } else {
        sendSuccessResponse(res, 200, 'User Access Token validated successfully!')
      }
    })
  } else {
    sendSuccessResponse(res, 200, 'Facebook account is not connected.')
  }
}

exports.updateShowIntegrations = function (req, res) {
  let showIntegrations = req.body.showIntegrations
  utility.callApi('user/update', 'post', {query: {_id: req.user._id}, newPayload: {showIntegrations}, options: {}})
    .then(updated => {
      sendSuccessResponse(res, 200, 'Updated Successfully!')
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.disconnectFacebook = function (req, res) {
  utility.callApi('user/update', 'post', {query: {_id: req.user._id}, newPayload: {connectFacebook: false}, options: {}})
    .then(updated => {
      sendSuccessResponse(res, 200, 'Updated Successfully!')
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.updatePlatform = function (req, res) {
  utility.callApi('user/update', 'post', {query: {_id: req.user._id}, newPayload: {platform: req.body.platform}, options: {}})
    .then(updated => {
      sendSuccessResponse(res, 200, 'Updated Successfully!')
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

exports.updatePicture = function (req, res) {
  utility.callApi(`user/updatePicture`, 'get', 'accounts', req.headers.authorization)
    .then(updatedUser => {
      sendSuccessResponse(res, 200, updatedUser)
    }).catch(error => {
      logger.serverLog(TAG, `Error while retrieving profile picture for user ${util.inspect(error)}`, 'error')
      sendErrorResponse(res, 500, `Failed to retrieve profile picture of user ${JSON.stringify(error)}`)
    })
}
