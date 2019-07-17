'use strict'
const logger = require('../../../components/logger')
const TAG = 'api/passwordresettoken/passwordresettoken.controller.js'
const utility = require('../utility')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.change = function (req, res) {
  utility.callApi('reset_password/change', 'post', {old_password: req.body.old_password, new_password: req.body.new_password}, 'accounts', req.headers.authorization)
    .then((result) => {
      logger.serverLog(TAG, 'result from invite endpoint accounts', 'debug')
      logger.serverLog(TAG, result, 'debug')
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      logger.serverLog(TAG, err, 'error')
      sendErrorResponse(res, 500, '', err.error.description)
    })
  /* let userId = req.user._id
  let oldPass = String(req.body.old_password)
  let newPass = String(req.body.new_password)

  User.findById(userId, function (err, user) {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    }
    if (user.authenticate(oldPass)) {
      user.password = newPass
      user.save(function (err) {
        if (err) {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error ${JSON.stringify(err)}`
          })
        }
        res.status(200).json(
          {status: 'success', description: 'Password changed successfully.'})
      })
    } else {
      res.status(403)
        .json({status: 'failed', description: 'Wrong current password.'})
    }
  }) */
}
