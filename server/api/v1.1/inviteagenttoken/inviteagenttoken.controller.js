'use strict'
// eslint-disable-next-line no-unused-vars
const logger = require('../../../components/logger')
// eslint-disable-next-line no-unused-vars
const TAG = 'api/inviteagenttoken/inviteagenttoken.controller.js'
const callApi = require('../utility')

exports.verify = function (req, res) {
  callApi.callApi(`invite_verification/${req.params.id}`, 'get', {})
    .then(result => {
      res.status(200).json({
        status: 'success',
        payload: 'Verify Token Success'
      })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    })
}
