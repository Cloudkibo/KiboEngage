const prepareMessageData = require('./prepareMessageData')
const { facebookApiCaller } = require('./facebookApiCaller')
const util = require('util')

exports.callBroadcastMessagesEndpoint = (messageCreativeId, labels, notlabels, pageAccessToken) => {
  return new Promise((resolve, reject) => {
    let data = {
      'message_creative_id': messageCreativeId,
      'notification_type': 'REGULAR',
      'messaging_type': 'MESSAGE_TAG',
      'tag': 'NON_PROMOTIONAL_SUBSCRIPTION'
      // 'targeting': {
      //   'labels': {
      //     'operator': 'NOT',
      //     'values': notlabels
      //   }
      // }
    }
    console.log('braodcast data to be sent', util.inspect(data))
    facebookApiCaller('v2.11', `me/broadcast_messages?access_token=${pageAccessToken}`, 'post', data)
      .then(response => {
        console.log('response from facebookApiCaller', JSON.stringify(response.body))
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

exports.callMessageCreativesEndpoint = (data, pageAccessToken, module = 'broadcast') => {
  return new Promise((resolve, reject) => {
    console.log('message_creatives data', util.inspect(data))
    getMessagesData(data, module).then(messages => {
      let dataToSend = {
        'messages': messages
      }
      console.log('dataToSend in message_creatives', JSON.stringify(dataToSend))
      facebookApiCaller('v2.11', `me/message_creatives?access_token=${pageAccessToken}`, 'post', dataToSend)
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

const getMessagesData = (payload, module) => {
  return new Promise((resolve, reject) => {
    if (module === 'broadcast') {
      let messages = []
      messages.push(prepareMessageData.facebook(payload, '{{first_name}}', '{{last_name}}'))
      console.log('messages', util.inspect(messages))
      resolve(messages)
    } else {
      resolve([JSON.stringify(payload)])
    }
  })
}

exports.getMessagesData = getMessagesData
