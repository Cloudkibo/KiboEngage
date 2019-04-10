const prepareMessageData = require('./prepareMessageData')
const { facebookApiCaller } = require('./facebookApiCaller')
const util = require('util')

exports.callBroadcastMessagesEndpoint = (messageCreativeId, labels, pageAccessToken) => {
  return new Promise((resolve, reject) => {
    let data = {
      'message_creative_id': messageCreativeId,
      'notification_type': 'REGULAR',
      'messaging_type': 'MESSAGE_TAG',
      'tag': 'NON_PROMOTIONAL_SUBSCRIPTION',
      'targetting': {
        'labels': {
          'operator': 'AND',
          'values': labels
        }
      }
    }
    console.log('braodcast data to be sent', util.inspect(data))
    facebookApiCaller('v2.11', `me/broadcast_messages?access_token=${pageAccessToken}`, 'post', data)
      .then(response => {
        if (response.body.broadcast_id) {
          resolve({status: 'success', broadcast_id: response.body.broadcast_id})
        } else {
          resolve({status: 'failed', description: response.body.error})
        }
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.callMessageCreativesEndpoint = (data, pageAccessToken) => {
  return new Promise((resolve, reject) => {
    console.log('message_creatives data', util.inspect(data))
    getMessagesData(data).then(messages => {
      let dataToSend = {
        'messages': messages
      }
      console.log('dataToSend', JSON.stringify(dataToSend))
      facebookApiCaller('v2.11', `me/message_creatives?access_token=${pageAccessToken}`, 'post', JSON.stringify(dataToSend))
        .then(response => {
          if (response.body.message_creative_id) {
            resolve({status: 'success', message_creative_id: response.body.message_creative_id})
          } else {
            resolve({status: 'failed', description: response.body.error})
          }
        })
        .catch(err => {
          reject(err)
        })
    })
  })
}

const getMessagesData = (payload) => {
  return new Promise((resolve, reject) => {
    let messages = []
    payload.forEach((item, i) => {
      messages.push(prepareMessageData.facebook(item, '{{first_name}}', '{{last_name}}'))
      if (i === messages.length - 1) {
        console.log('messages', util.inspect(messages))
        resolve(messages)
      }
    })
  })
}

exports.getMessagesData = getMessagesData
