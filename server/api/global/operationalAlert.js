let { getEmailObject, getMailTransporter } = require('./utility')
let logger = require('./../../components/logger')
let TAG = 'server/api/global/operationalAlert.js'
let config = require('./../../config/environment')

exports.sendOpAlert = function (errObj, codePart, pageId, userId, companyId) {
  const Raven = require('raven')
  Raven.captureException(errObj)

  let email = getEmailObject(['sojharo@cloudkibo.com', 'jawaid@cloudkibo.com', 'faizan@cloudkibo.com'], 'support@cloudkibo.com', 'KiboPush: Facebook Error', 'Facebook Error', errObj.message, errObj.code, errObj.error_subcode, codePart, pageId, userId._id, companyId)

  let transporter = getMailTransporter()

  if (config.env === 'production') {
    transporter.sendMail(email, function (err, data) {
      if (err) {
        logger.serverLog(TAG, 'error in sending Alert email ' + err, 'debug')
      }
    })
  }
}
