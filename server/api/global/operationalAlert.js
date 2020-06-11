let { getEmailObject, getMailTransporter } = require('./utility')
let logger = require('./../../components/logger')
let TAG = 'server/api/global/operationalAlert.js'
let config = require('./../../config/environment')

exports.sendOpAlert = function (errObj, codePart, pageId, userId, companyId) {
  if (config.env === 'production') {
    const Raven = require('raven')
    try {
      throw new Error(errObj.message)
    } catch (e) {
      Raven.captureException(e, {
        extra: {codePart: codePart, pageId: pageId, userId: userId, companyId: companyId}, // Any other data you'd specify with setContext
        level: 'error' // Event level
      })
    }
  }

  // NOTE: We were using email to send facebook alerts before.
  // I have comment out this logic as now these errors go to sentry
  // let email = getEmailObject(['sojharo@cloudkibo.com', 'jawaid@cloudkibo.com', 'faizan@cloudkibo.com'], 'admin@cloudkibo.com', 'KiboPush: Facebook Error', 'Facebook Error', errObj.message, errObj.code, errObj.error_subcode, codePart, pageId, userId._id, companyId)

  // let transporter = getMailTransporter()

  // if (config.env === 'production') {
  //   transporter.sendMail(email, function (err, data) {
  //     if (err) {
  //       logger.serverLog(TAG, 'error in sending Alert email ' + err, 'debug')
  //     }
  //   })
  // }
}
