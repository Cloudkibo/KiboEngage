const logger = require('../../../components/logger')
const TAG = 'api/companyprofile/company.controller.js'
const utility = require('../utility')
// const logicLayer = require('./commentCapture.logiclayer')

exports.members = function (req, res) {
  utility.callApi(`companyprofile/members`, 'get', {}, req.headers.authorization)
    .then(members => {
      res.status(200).json({status: 'success', payload: members})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', payload: `Failed to fetch members ${err}`})
    })
}
exports.getAutomatedOptions = function (req, res) {
  utility.callApi(`companyprofile/getAutomatedOptions`, 'get', {}, req.headers.authorization)
    .then(payload => {
      res.status(200).json({status: 'success', payload: payload})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', payload: `Failed to fetch automated options ${err}`})
    })
}

exports.invite = function (req, res) {
  utility.callApi('companyprofile/invite', 'post', {email: req.body.email, name: req.body.name}, req.headers.authorization)
    .then((result) => {
      logger.serverLog(TAG, 'result from invite endpoint accounts')
      logger.serverLog(TAG, result)
      res.status(200).json(result)
    })
    .catch((err) => {
      logger.serverLog(TAG, 'result from invite endpoint accounts')
      logger.serverLog(TAG, err)
      res.status(500).json(err)
    })
}
