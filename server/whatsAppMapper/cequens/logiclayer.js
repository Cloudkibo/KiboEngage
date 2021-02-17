var path = require('path')
const { containsURL } = require('../../api/global/utility')

exports.prepareTemplates = (cequensTemplates) => {
  let templates = []
  for (let i = 0; i < cequensTemplates.length; i++) {
    if (cequensTemplates[i].status === 'APPROVED') {
      let template = {}
      template.name = cequensTemplates[i].name
      let templateComponents = cequensTemplates[i].components
      template.code = cequensTemplates[i].language
      template.type = 'TEXT'
      template.id = cequensTemplates[i].id
      for (let j = 0; j < templateComponents.length; j++) {
        if (templateComponents[j].type === 'BODY') {
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
exports.prepareInvitationPayload = (body, number) => {
  let templateArguments = body.payload.templateArguments.split(',')
  let MessageObject = {
    to: number.replace(/\D/g, ''),
    recipient_type: 'individual',
    type: 'template',
    template: {
      namespace: 'c088281d_2079_43e6_820e_5389ef88806d',
      name: body.payload.templateName,
      language: {
        policy: 'deterministic',
        code: body.payload.templateCode
      },
      components: [
        {
          type: 'body',
          parameters: templateArguments.map(t => {
            return {
              type: 'text',
              text: t
            }
          })
        }
      ]
    }
  }
  return MessageObject
}
exports.prepareSendMessagePayload = (whatsApp, contact, payload) => {
  let MessageObject = {
    to: contact.number.replace(/\D/g, ''),
    recipient_type: 'individual'
  }
  if (payload.componentType === 'text') {
    if (payload.templateName) {
      let templateArguments = payload.templateArguments.split(',')
      MessageObject.type = 'template'
      MessageObject['template'] = {
        namespace: 'c088281d_2079_43e6_820e_5389ef88806d',
        name: payload.templateName,
        language: {
          policy: 'deterministic',
          code: payload.templateCode
        },
        components: [
          {
            type: 'body',
            parameters: templateArguments.map(t => {
              return {
                type: 'text',
                text: t
              }
            })
          }
        ]
      }
    } else {
      if (containsURL(payload.text)) {
        MessageObject.preview_url = true
      }
      MessageObject.type = 'text'
      MessageObject['text'] = {
        body: payload.text
      }
    }
  } else if (payload.componentType === 'media') {
    if (payload.mediaType === 'image') {
      MessageObject.type = 'image'
      MessageObject['image'] = {
        link: payload.fileurl.url || payload.fileurl,
        caption: payload.caption
      }
    } else if (payload.mediaType === 'video') {
      MessageObject.type = 'video'
      MessageObject['video'] = {
        link: payload.fileurl.url || payload.fileurl,
        caption: payload.caption
      }
    }
  } else if (payload.componentType === 'file') {
    let ext = path.extname(payload.fileurl.name)
    let fileName = ''
    if (ext !== '') {
      fileName = payload.fileurl.name.replace(ext, '')
    }
    MessageObject.type = 'document'
    MessageObject['document'] = {
      link: payload.fileurl.url || payload.fileurl,
      caption: fileName
    }
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
