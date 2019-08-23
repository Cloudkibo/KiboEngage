let { getEmailObject, getAlertEmailWithBody } = require('./utility')
let { getSendGridObject } = require('./../../config/environment')
let logger = require('./../../components/utility')
let TAG = 'server/api/global/operationalAlert.js'

exports.sendOpAlert = function (errObj, codePart) {
  let email = getEmailObject('sojharo@cloudkibo.com', 'support@cloudkibo.com', 'KiboPush: Facebook Error', 'Facebook Error')
  let emailWithBody = getAlertEmailWithBody(email, errObj.message, codePart)
  getSendGridObject()
    .send(emailWithBody, function (err, json) {
      if (err) {
        logger.log(TAG, 'error in sending Alert email ' + err, 'debug')
      }
    })
}
