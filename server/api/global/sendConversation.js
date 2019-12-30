const { callApi } = require('../v1.1/utility')
const logger = require('../../components/logger')
const TAG = 'global/sendConversation.js'
const request = require('request')
const prepareMessageData = require('./prepareMessageData')
const { saveLiveChat, preparePayload } = require('./livechat')

const sendUsingBatchAPI = (module, payload, subsCriteria, page, user, result, saveMsgRecord, recordObj) => {
  callApi(`subscribers/query`, 'post', subsCriteria)
    .then(subscribers => {
      if (subscribers.length > 0) {
        let batch = _prepareBatchData(module, payload, subscribers, page, user)
        _callBatchAPI(JSON.stringify(batch), page.accessToken)
          .then(response => {
            logger.serverLog(TAG, `batch_api response ${JSON.stringify(response)}`)
            result = _prepareReport(module, payload.length, response, subscribers, result, saveMsgRecord, recordObj)
            subsCriteria['_id'] = {$gt: subscribers[subscribers.length - 1]._id}
            sendUsingBatchAPI(payload, subsCriteria, page.accessToken, result, saveMsgRecord, recordObj)
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to send using batch api ${err}`, 'error')
          })
      } else {
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
const _prepareBatchData = (module, payload, subscribers, page, user) => {
  let batch = []
  for (let i = 0; i <= subscribers.length; i++) {
    if (i === subscribers.length) {
      return batch
    } else {
      let recipient = "recipient=" + encodeURIComponent(JSON.stringify({"id": subscribers[i].senderId}))
      let tag = "tag=" + encodeURIComponent("NON_PROMOTIONAL_SUBSCRIPTION")
      let messagingType = "messaging_type=" + encodeURIComponent("MESSAGE_TAG")
      payload.forEach((item, index) => {
        let message = "message=" + encodeURIComponent(_prepareMessageData(module, item, subscribers[i]))
        if (index === 0) {
          batch.push({ "method": "POST", "name": `${subscribers[i].senderId}${index + 1}`, "relative_url": "v4.0/me/messages", "body": recipient + "&" + message + "&" + messagingType +  "&" + tag })
        } else {
          batch.push({ "method": "POST", "name": `${subscribers[i].senderId}${index + 1}`, "depends_on": `${subscribers[i].senderId}${index}`, "relative_url": "v4.0/me/messages", "body": recipient + "&" + message + "&" + messagingType +  "&" + tag })
        }
        if (['polls', 'surveys'].includes(item.componentType)) {
          saveLiveChat(preparePayload(user, subscribers[i], page, item))
        }
      })
    }
  }
}
/* eslint-enable */

const _prepareMessageData = (module, item, subscriber) => {
  let message = ['autoposting'].includes(module) ? JSON.stringify(item)
    : prepareMessageData.facebook(item, subscriber.firstName, subscriber.lastName)
  return message
}

const _prepareReport = (module, increment, data, subscribers, result, saveMsgRecord, recordObj) => {
  for (let i = 0; i < data.length; i += increment) {
    let index = (increment - 1) + i
    if (data[index].code === 200) {
      result.successful = result.successful + 1
      if (!['autoposting'].includes(module)) {
        recordObj['subscriberId'] = subscribers[Math.floor(index / increment)].senderId
        saveMsgRecord(recordObj)
      }
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