var path = require('path')

exports.prepareSendMessagePayload = (body, contactNumbers, payload) => {
  let route = ''
  let MessageObject = {
    token: body.whatsApp.accessToken,
    number_details: JSON.stringify(contactNumbers)
  }
  if (payload.componentType === 'text') {
    if (payload.templateName) {
      MessageObject.template_name = payload.templateName
      MessageObject.template_argument = payload.templateArguments
      MessageObject.language = 'en'
      route = 'hsm'
    } else {
      MessageObject.message = payload.text
      route = 'text'
    }
  } else if (payload.componentType === 'media') {
    if (payload.mediaType === 'image') {
      MessageObject.image = payload.fileurl.url || payload.fileurl
      route = 'image'
    } else if (payload.mediaType === 'video') {
      MessageObject.video = payload.fileurl.url || payload.fileurl
      route = 'video'
    }
  } else if (payload.componentType === 'file') {
    let ext = path.extname(payload.fileurl.name)
    let fileName = ''
    if (ext !== '') {
      fileName = payload.fileurl.name.replace(ext, '')
    }
    MessageObject.title = fileName
    MessageObject.file = payload.fileurl.url || payload.fileurl
    route = 'file'
  }
  return {
    MessageObject,
    route
  }
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
exports.prepareTemplates = (flockSendTemplates) => {
  let templates = []
  for (let i = 0; i < flockSendTemplates.length; i++) {
    if (flockSendTemplates[i].localizations[0].status === 'APPROVED') {
      let template = {}
      template.name = flockSendTemplates[i].templateName
      let templateComponents = flockSendTemplates[i].localizations[0].components
      for (let j = 0; j < templateComponents.length; j++) {
        if (templateComponents[j].type === 'BODY') {
          template.type = 'TEXT'
          template.text = templateComponents[j].text
          let argumentsRegex = /{{[0-9]}}/g
          let templateArguments = template.text.match(argumentsRegex).join(',')
          template.templateArguments = templateArguments
          let regex = template.text.replace('.', '\\.')
          regex = regex.replace(argumentsRegex, '(.*)')
          template.regex = `^${regex}$`
        } else if (templateComponents[j].type === 'BUTTONS') {
          template.buttons = templateComponents[j].buttons.map(button => {
            return {
              title: button.text
            }
          })
        }
      }
      if (!template.buttons) {
        template.buttons = []
      }
      templates.push(template)
    }
  }
  return templates
}
exports.prepareInvitationPayload = (data) => {
  let contactNumbers = []
  data.numbers.map((c) => contactNumbers.push({ phone: c }))
  let MessageObject = {
    token: data.whatsApp.accessToken,
    number_details: JSON.stringify(contactNumbers),
    template_name: data.payload.templateName,
    template_argument: data.payload.templateArguments,
    language: 'en'
  }
  return MessageObject
}
