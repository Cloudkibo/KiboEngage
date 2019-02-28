const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/profilePic.controller'

exports.updateProfilePic = function (req, res) {
  logger.serverLog(TAG, `in updateProfilePic ${JSON.stringify(req.body)}`)
  callApi(`subscribers/update`, 'put', {query: {senderId: req.body.senderId}, newPayload: {profilePic: req.body.profilePic}, options: {}})
    .then(updated => {
      return res.status(200).json({
        status: 'success',
        description: `updated profile picture for senderId ${req.body.senderId}: ${req.body.profilePic}`
      })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'error',
        description: `error: ${err}`
      })
    })
}
