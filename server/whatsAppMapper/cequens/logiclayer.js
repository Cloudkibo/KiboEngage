var path = require('path')
const { containsURL } = require('../../api/global/utility')

exports.prepareTemplates = () => {
  let templates = [
    {
      name: 'cequens_autoreply',
      id: 'c088281d_2079_43e6_820e_5389ef88806d',
      code: 'en',
      text: 'This is automated message regarding to your Ticket No. {{1}}. We have received your request and will get back to you within 1 working day',
      templateArguments: '{{1}}',
      regex: '^This is automated message regarding to your Ticket No. (.*). We have received your request and will get back to you within 1 working day$',
      buttons: []
    }
  ]
  return templates
}
exports.prepareInvitationPayload = (body, number) => {
  let templateArguments = body.payload.templateArguments.split(',')
  let MessageObject = {
    to: number.replace(/\D/g, ''),
    recipient_type: 'individual',
    type: 'template',
    template: {
      namespace: body.payload.templateId,
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
        namespace: payload.templateId,
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
