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
      sendOpAlert(body.error, 'in utility of messengerevents in kiboengage')
    }
  })
  const form = r.form()
  form.append('access_token', page.accessToken)
  form.append('batch', batchMessages)
}
exports.sendBroadcast = sendBroadcast
