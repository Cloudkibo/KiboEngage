const config = require('../../config/environment/index')

exports.prepareSendMessagePayload = (whatsApp, contact, payload) => {
  let MessageObject = {
    mediaUrl: payload.componentType === 'text' ? [] : payload.file ? [payload.file.fileurl.url] : [payload.fileurl.url],
    body: payload.componentType === 'text' ? payload.text : (payload.componentType === 'file') ? payload.file.fileName : '',
    from: `whatsapp:${whatsApp.sandboxNumber}`,
    to: `whatsapp:${contact.number}`,
    statusCallback: `${config.api_urls['webhook']}/webhooks/twilio`
  }
  return MessageObject
}
exports.prepareChat = (body, contact, payload) => {
  let MessageObject = {
    senderNumber: body.whatsApp.businessNumber,
    recipientNumber: contact.number,
    contactId: contact._id,
    companyId: body.companyId,
    payload: payload
  }
  return MessageObject
}
