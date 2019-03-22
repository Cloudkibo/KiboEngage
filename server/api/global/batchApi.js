const prepareMessageData = require('./prepareMessageData')

/* eslint-disable */
exports.batchApi = (payload, recipientId, page, sendBroadcast, fname, lname, res, subscriberNumber, subscribersLength, fbMessageTag, testBroadcast) => {
  let recipient = "recipient=" + encodeURIComponent(JSON.stringify({"id": recipientId}))
  let tag = "tag=" + encodeURIComponent(fbMessageTag)
  let messagingType = "messaging_type=" + encodeURIComponent("MESSAGE_TAG")
  let batch = []
  payload.forEach((item, index) => {
    let message = "message=" + encodeURIComponent(JSON.stringify(prepareMessageData.facebook(item, fname, lname)))
    if (index === 0) {
      batch.push({ "method": "POST", "name": `message${index + 1}`, "relative_url": "v2.6/me/messages", "body": recipient + "&" + message + "&" + messagingType +  "&" + tag})
    } else {
      batch.push({ "method": "POST", "name": `message${index + 1}`, "depends_on": `message${index}`, "relative_url": "v2.6/me/messages", "body": recipient + "&" + message + "&" + messagingType +  "&" + tag})
    }
    if (index === (payload.length - 1)) {
      sendBroadcast(JSON.stringify(batch), page, res, subscriberNumber, subscribersLength, testBroadcast)
    }
  })
}
/* eslint-disable */
