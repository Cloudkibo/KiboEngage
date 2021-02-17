const config = require('../../config/environment/index')

exports.prepareSendMessagePayload = (whatsApp, contact, payload) => {
  let MessageObject = {
    mediaUrl: payload.componentType === 'text' ? [] : payload.file ? [payload.file.fileurl.url] : [payload.fileurl.url],
    body: payload.componentType === 'text' ? payload.text : (payload.componentType === 'file') ? payload.file.fileName : '',
    from: `whatsapp:${whatsApp.businessNumber}`,
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
exports.prepareInvitationPayload = (body, number) => {
  let MessageObject = {
    body: body.payload.text,
    from: `whatsapp:${body.whatsApp.businessNumber}`,
    to: `whatsapp:${number}`,
    statusCallback: `${config.api_urls['webhook']}/webhooks/twilio`
  }
  return MessageObject
}
exports.prepareTemplates = () => {
  let templates = [
    {
      type: 'TEXT',
      name: 'registration_code',
      text: 'Your {{1}} code is {{2}}',
      templateArguments: '{{1}},{{2}}',
      regex: '^Your (.*) code is (.*)$',
      buttons: []
    },
    {
      type: 'TEXT',
      name: 'appointment_reminder',
      text: 'Your appointment is coming up on {{1}} at {{2}}',
      templateArguments: '{{1}},{{2}}',
      regex: '^Your appointment is coming up on (.*) at (.*)$',
      buttons: []
    },
    {
      type: 'TEXT',
      name: 'order_update',
      text: 'Your {{1}} order of {{2}} has shipped and should be delivered on {{3}}. Details: {{4}}',
      templateArguments: '{{1}},{{2}},{{3}},{{4}}',
      regex: '^Your (.*) order of (.*) has shipped and should be delivered on (.*). Details: (.*)$',
      buttons: []
    }
  ]
  return templates
}
