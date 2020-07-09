const logger = require('../../../components/logger')
const TAG = 'api/messengerEvents/utility.js'
const request = require('request')
let { sendOpAlert } = require('./../../global/operationalAlert')

const sendBroadcast = (batchMessages, page, res, subscriberNumber, subscribersLength, testBroadcast) => {
  const r = request.post('https://graph.facebook.com', (err, httpResponse, body) => {
    if (err) {
      logger.serverLog(TAG, `Batch send error ${JSON.stringify(err)}`, 'error')
    }
    if (body.error) {
      sendOpAlert(body.error, 'in utility of messengerevents in kiboengage', page._id, page.userId, page.companyId)
    }
    logger.serverLog(TAG, `Batch send response ${JSON.stringify(body)}`)
  })
  const form = r.form()
  form.append('access_token', page.accessToken)
  form.append('batch', batchMessages)
}

exports.validateEmail = (email) => {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(String(email).toLowerCase())
}
exports.validatePhoneNumber = (number) => {
  let regexp = /^[0-9+\(\)#\.\s\/ext-]+$/
  return regexp.test(number)
}

exports.sendBroadcast = sendBroadcast
