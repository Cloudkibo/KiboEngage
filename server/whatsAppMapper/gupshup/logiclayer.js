exports.prepareSendMessagePayload = (whatsApp, contact, payload) => {
  let route = 'msg'
  let from = whatsApp.businessNumber.replace(/\D/g, '')
  let to = contact.number.replace(/\D/g, '')
  let appName = whatsApp.appName
  let componentType = payload.componentType
  let MessageObject = `channel=whatsapp&source=${from}&destination=${to}&src.name=${appName}`
  if (componentType === 'text') {
    if (payload.templateName) {
      let templateArguments = payload.templateArguments.split(',')
      let message = JSON.stringify({
        id: payload.templateId,
        params: templateArguments
      })
      route = 'template/msg'
      MessageObject = MessageObject + `&template=${message}`
    } else {
      MessageObject = MessageObject + `&message.type=text&message.text=${payload.text}`
    }
  } else {
    let message
    let url = payload.fileurl.url || payload.fileurl
    if (componentType === 'media') {
      if (payload.mediaType === 'image') {
        message = JSON.stringify({
          type: 'image',
          originalUrl: url,
          previewUrl: url,
          caption: payload.caption
        })
      } else if (payload.mediaType === 'video') {
        message = JSON.stringify({
          type: 'video',
          url: url,
          caption: payload.caption
        })
      }
    } else if (payload.componentType === 'file') {
      message = JSON.stringify({
        type: 'file',
        url: url,
        filename: payload.fileName
      })
    }
    MessageObject = MessageObject + `&message=${message}`
  }
  return {MessageObject, route}
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
exports.prepareTemplates = (gupshupTemplates) => {
  let templates = []
  for (let i = 0; i < gupshupTemplates.length; i++) {
    if (gupshupTemplates[i].status === 'APPROVED' || gupshupTemplates[i].status === 'SANDBOX_REQUESTED') {
      let template = {}
      template.code = gupshupTemplates[i].languageCode
      template.id = gupshupTemplates[i].id
      template.name = gupshupTemplates[i].elementName
      template.text = gupshupTemplates[i].data
      let argumentsRegex = /{{[0-9]}}/g
      let templateArguments = template.text.match(argumentsRegex) ? template.text.match(argumentsRegex).join(',') : ''
      template.templateArguments = templateArguments
      let regex = template.text.replace('.', '\\.')
      regex = regex.replace(argumentsRegex, '(.*)')
      template.regex = `^${regex}$`
      if (!template.buttons) {
        template.buttons = []
      }
      templates.push(template)
    }
  }
  return templates
}
exports.prepareInvitationPayload = (body, number) => {
  let templateArguments = body.payload.templateArguments.split(',')
  let from = body.whatsApp.businessNumber.replace(/\D/g, '')
  let to = number.replace(/\D/g, '')
  let appName = body.whatsApp.appName
  let MessageObject = `channel=whatsapp&source=${from}&destination=${to}&src.name=${appName}`
  let message = JSON.stringify({
    id: body.payload.templateId,
    params: templateArguments
  })
  MessageObject = MessageObject + `&template=${message}`
  return MessageObject
}
