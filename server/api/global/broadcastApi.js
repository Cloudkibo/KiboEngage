const prepareMessageData = require('./prepareMessageData')
const { facebookApiCaller } = require('./facebookApiCaller')

exports.callBroadcastMessagesEndpoint = (messageCreativeId, labels, pageAccessToken) => {
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
  facebookApiCaller('v2.11', `me/broadcast_messages?access_token=${pageAccessToken}`, 'post', data)
    .then(response => {
      if (response.broadcast_id) {
        return {status: 'success', broadcast_id: response.broadcast_id}
      } else {
        return {status: 'failed', description: response.error}
      }
    })
    .catch(err => {
      return err
    })
}

exports.callMessageCreativesEndpoint = (data, pageAccessToken) => {
  facebookApiCaller('v2.11', `me/message_creatives?access_token=${pageAccessToken}`, 'post', data)
    .then(response => {
      if (response.message_creative_id) {
        return {status: 'success', message_creative_id: response.message_creative_id}
      } else {
        return {status: 'failed', description: response.error}
      }
    })
    .catch(err => {
      return err
    })
}

exports.getMessagesData = (payload) => {
  let messages = []
  payload.forEach((item, i) => {
    messages.push(prepareMessageData.facebook(payload, '{{first_name}}', '{{last_name}}'))
    if (i === messages.length - 1) {
      return messages
    }
  })
}
