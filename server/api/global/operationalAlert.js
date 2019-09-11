let { getEmailObject } = require('./utility')
let { getSendGridObject } = require('./../../components/utility')
let logger = require('./../../components/logger')
let TAG = 'server/api/global/operationalAlert.js'

exports.sendOpAlert = function (errObj, codePart, pageId, userId, companyId) {
  let email = getEmailObject(['sojharo@cloudkibo.com', 'jawaid@cloudkibo.com', 'faizan@cloudkibo.com'], 'support@cloudkibo.com', 'KiboPush: Facebook Error', 'Facebook Error', errObj.message, errObj.code, errObj.error_subcode, codePart, pageId, userId, companyId)
  if (require('./../../config/environment').env === 'production') {
    getSendGridObject()
      .send(email, function (err, json) {
        if (err) {
          logger.log(TAG, 'error in sending Alert email ' + err, 'debug')
        }
      })
  }
}
