const prepareMessageData = require('./prepareMessageData')
const { facebookApiCaller } = require('./facebookApiCaller')
const { sendOpAlert } = require('./operationalAlert')
const TAG = 'api/global/broadcastApi.js'
const logger = require('../../components/logger')
// const util = require('util')

exports.callBroadcastMessagesEndpoint = (messageCreativeId, labels, notlabels, pageAccessToken, page, location, tag) => {
  return new Promise((resolve, reject) => {
    let labelValues = labels
    labelValues.push({operator: 'NOT', values: notlabels})
    let data = {
      'message_creative_id': messageCreativeId,
      'notification_type': 'REGULAR',
      'messaging_type': tag !== undefined ? tag : 'MESSAGE_TAG',
      'tag': 'NON_PROMOTIONAL_SUBSCRIPTION',
      'targeting': JSON.stringify({
        labels: {
          operator: 'AND',
          values: labelValues
        }
      })
    }
    if (tag === 'UPDATE') {
      delete data.tag
    }
    facebookApiCaller('v2.11', `me/broadcast_messages?access_token=${pageAccessToken}`, 'post', data)
      .then(response => {
        console.log('response from facebookApiCaller', JSON.stringify(response.body))
        if (response.body.broadcast_id) {
          resolve({status: 'success', broadcast_id: response.body.broadcast_id})
        } else {
          let errorObj = response.body.error
          if (errorObj && errorObj.code === 10 && errorObj.error_subcode === 2018065) {
            resolve({status: 'failed', description: errorObj.message})
          } else {
            sendOpAlert(response.body.error, 'function: callBroadcastMessagesEndpoint file: ' + location, page._id, page.userId, page.companyId)
            resolve({status: 'failed', description: response.body.error})
          }
        }
      })
      .catch(err => {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.callBroadcastMessagesEndpoint`, data, {}, 'error')
        reject(err)
      })
  })
}

exports.callMessageCreativesEndpoint = (data, pageAccessToken, page, location, module = 'broadcast') => {
  return new Promise((resolve, reject) => {
    getMessagesData(data, module).then(messages => {
      let dataToSend = {
        'messages': messages
      }
      facebookApiCaller('v2.11', `me/message_creatives?access_token=${pageAccessToken}`, 'post', dataToSend)
        .then(response => {
          if (response.body.message_creative_id) {
            resolve({status: 'success', message_creative_id: response.body.message_creative_id})
          } else {
            const message = response.body.error || 'callMessageCreativesEndpoint error in facebookApiCaller'
            logger.serverLog(message, `${TAG}: exports.callMessageCreativesEndpoint`, data, {}, 'error')
            sendOpAlert(response.body.error, 'Function: callMessageCreativesEndpoint File :' + location, page._id, page.userId, page.companyId)
            resolve({status: 'failed', description: response.body.error})
          }
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.callMessageCreativesEndpoint`, data, {}, 'error')
          reject(err)
        })
    })
  })
}

const getMessagesData = (payload, module) => {
  return new Promise((resolve, reject) => {
    if (module === 'broadcast') {
      let messages = []
      messages.push(prepareMessageData.facebook(payload, '{{first_name}}', '{{last_name}}'))
      resolve(messages)
    } else {
      resolve([JSON.stringify(payload)])
    }
  })
}

exports.getMessagesData = getMessagesData
