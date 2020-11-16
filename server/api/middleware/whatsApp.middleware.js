'use strict'
const compose = require('composable-middleware')
const utility = require('../v1.1/utility')
const TAG = 'api/middleware/whatsApp.middleware'
const logger = require('../../components/logger')

exports.attachProviderInfo = () => {
  return compose().use((req, res, next) => {
    utility.callApi(`companyProfile/query`, 'post', { _id: req.user.companyId })
      .then(companyProfile => {
        if (!companyProfile) {
          return res.status(500).json({
            status: 'failed',
            description: 'No company profile found'
          })
        }
        if (!companyProfile.whatsApp) {
          return res.status(500).json({
            status: 'failed',
            description: 'No whatsApp Provider found'
          })
        }
        req.user.whatsApp = companyProfile.whatsApp
        next()
      })
      .catch(err => {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.attachProviderInfo`, req.body, {user: req.user}, 'error')
        return res.status(500)
          .json({ status: 'failed', description: `Internal Server Error: ${err}` })
      })
  })
}
