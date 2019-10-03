const { callApi } = require('../v1.1/utility')
const logger = require('../../components/logger')
const TAG = 'global/sendConversation.js'
const request = require('request')
const prepareMessageData = require('./prepareMessageData')

const sendUsingBatchAPI = (payload, subsCriteria, accessToken, count, result) => {
  callApi(`subscribers/aggregate`, 'post', subsCriteria)
    .then(subscribers => {
      console.log('subscribers count', subscribers.length)
      if (subscribers.length > 0 && count > 0) {
        let subscriberIds = subscribers.map((s) => s.senderId)
        let batch = _prepareBatchData(payload, subscriberIds)
        console.log('batch requests', batch.length)
        _callBatchAPI(JSON.stringify(batch), accessToken)
          .then(response => {
            logger.serverLog(TAG, JSON.stringify(response))
            result = _prepareReport(payload.length, response, subscribers, result)
            console.log(`report at ${count} iteration`, result)
            count = count - 1
            sendUsingBatchAPI(payload, subsCriteria, accessToken, count, result)
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to send using batch api ${err}`, 'error')
          })
      } else {
        console.log('final report')
        logger.serverLog(TAG, result)
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch subscribers ${err}`, 'error')
    })
}

const _callBatchAPI = (batch, accessToken) => {
  return new Promise((resolve, reject) => {
    const r = request.post('https://graph.facebook.com', (err, httpResponse, body) => {
      if (err) {
        logger.serverLog(TAG, `Batch api error ${JSON.stringify(err)}`, 'error')
      } else {
        body = JSON.parse(body)
        resolve(body)
      }
    })
    const form = r.form()
    form.append('access_token', accessToken)
    form.append('batch', batch)
  })
}

/* eslint-disable */
const _prepareBatchData = (payload, subscriberIds) => {
  let batch = []
  for (let i = 0; i <= subscriberIds.length; i++) {
    if (i === subscriberIds.length) {
      return batch
    } else {
      let recipient = "recipient=" + encodeURIComponent(JSON.stringify({"id": subscriberIds[i]}))
      let tag = "tag=" + encodeURIComponent("NON_PROMOTIONAL_SUBSCRIPTION")
      let messagingType = "messaging_type=" + encodeURIComponent("MESSAGE_TAG")
      payload.forEach((item, index) => {
        let message = "message=" + encodeURIComponent(prepareMessageData.facebook(item, '', ''))
        if (index === 0) {
          batch.push({ "method": "POST", "name": `${subscriberIds[i]}${index + 1}`, "relative_url": "v4.0/me/messages", "body": recipient + "&" + message + "&" + messagingType +  "&" + tag})
        } else {
          batch.push({ "method": "POST", "name": `${subscriberIds[i]}${index + 1}`, "depends_on": `${subscriberIds[i]}${index}`, "relative_url": "v4.0/me/messages", "body": recipient + "&" + message + "&" + messagingType +  "&" + tag})
        }
      })
    }
  }
}
/* eslint-enable */

const _prepareReport = (increment, data, subscribers, result) => {
  for (let i = 0; i < data.length; i += increment) {
    let index = (increment - 1) + i
    if (data[index].code === 200) {
      result.successful = result.successful + 1
    } else {
      let message = 'An unexpected error occured.'
      if (
        data[index - (increment - 1)] &&
        JSON.parse(data[index - (increment - 1)].body) &&
        JSON.parse(data[index - (increment - 1)].body).error
      ) {
        message = JSON.parse(data[index - (increment - 1)].body).error.message
      }
      result.errors.push({
        subscriber: subscribers[Math.floor(index / increment)].firstName + ' ' + subscribers[Math.floor(index / increment)].lastName,
        message
      })
      result.unsuccessful = result.unsuccessful + 1
    }
  }
  return result
}

exports.sendUsingBatchAPI = sendUsingBatchAPI
