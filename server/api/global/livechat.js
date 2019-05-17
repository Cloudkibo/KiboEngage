const { callApi } = require('../v1.1/utility')
const logger = require('../../components/logger')
const TAG = 'api/global/livechat.js'

exports.saveLiveChat = function (message) {
  callApi('livechat', 'post', message, '', 'kibochat')
    .then(saved => {
      logger.serverLog('Live chat saved successfully!')
    })
    .catch(err => logger.serverLog(TAG, `Failed to saveLiveChat ${err}`))
}

exports.preparePayload = function (subscriber, page, message) {
  let payload = {
    format: 'convos',
    sender_id: page._id,
    recipient_id: subscriber._id,
    sender_fb_id: page.pageId,
    recipient_fb_id: subscriber.senderId,
    subscriber_id: subscriber._id,
    company_id: page.companyId,
    status: 'unseen', // seen or unseen
    payload: message
  }
  return payload
}
