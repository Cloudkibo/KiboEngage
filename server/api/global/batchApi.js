const prepareMessageData = require('./prepareMessageData')

/* eslint-disable */
exports.batchApi = (payload, recipientId, page, sendBroadcast, fname, lname, res, subscriberNumber, subscribersLength, fbMessageTag, testBroadcast, messagingTypeTag) => {
  let messagingTag = messagingTypeTag !== undefined ? messagingTypeTag : 'MESSAGE_TAG'
  let recipient = "recipient=" + encodeURIComponent(JSON.stringify({"id": recipientId}))
  let tag = "tag=" + encodeURIComponent(fbMessageTag)
  console.log('messagingTag', messagingTag)
  console.log('fbMessageTag', fbMessageTag)
  // let messagingType = "messaging_type=" + encodeURIComponent("MESSAGE_TAG")
  let messagingType = "messaging_type=" + encodeURIComponent(messagingTag)
  let batch = []
  payload.forEach((item, index) => {
    let message = "message=" + encodeURIComponent(prepareMessageData.facebook(item, fname, lname))
    if (index === 0) {
      if (messagingTag === 'MESSAGE_TAG') {
        batch.push({ "method": "POST", "name": `message${index + 1}`, "relative_url": "v2.6/me/messages", "body": recipient + "&" + message + "&" + messagingType +  "&" + tag})
      } else {
        batch.push({ "method": "POST", "name": `message${index + 1}`, "relative_url": "v2.6/me/messages", "body": recipient + "&" + message + "&" + messagingType})
      }
    } else {
      if (messagingTag === 'MESSAGE_TAG') {
        batch.push({ "method": "POST", "name": `message${index + 1}`, "depends_on": `message${index}`, "relative_url": "v2.6/me/messages", "body": recipient + "&" + message + "&" + messagingType})
      } else {
        batch.push({ "method": "POST", "name": `message${index + 1}`, "depends_on": `message${index}`, "relative_url": "v2.6/me/messages", "body": recipient + "&" + message + "&" + messagingType})
      }
    }
    if (index === (payload.length - 1)) {
      sendBroadcast(JSON.stringify(batch), page, res, subscriberNumber, subscribersLength, testBroadcast)
    }
  })
}
/* eslint-disable */
