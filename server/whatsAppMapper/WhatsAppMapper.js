const flockSend = require('../whatsAppMapper/flockSend/flockSend')
const twilio = require('../whatsAppMapper/twilio/twilio')
const { ActionTypes } = require('./constants')
const providers = [
  { key: 'flockSend', value: flockSend },
  { key: 'twilio', value: twilio }
]

exports.whatsAppMapper = (provider, action, data, callback) => {
  provider = providers.find(a => a.key === provider).value
  return callAction(action, data, provider, callback)
}

function callAction (action, data, provider) {
  switch (action) {
    case ActionTypes.SEND_BROADCAST_MESSAGES:
      return provider.sendBroadcastMessages(data)
    case ActionTypes.GET_TEMPLATES:
      return provider.getTemplates(data)
    case ActionTypes.SEND_INVITATION_TEMPLATE:
      return provider.sendInvitationTemplate(data)
    case ActionTypes.SET_WEBHOOK:
      return provider.setWebhook(data)
    case ActionTypes.VERIFY_CREDENTIALS:
      return provider.verifyCredentials(data)
    default: break
  }
}

exports.handleInboundMessageStatus = (provider, event) => {
  provider = providers.find(a => a.key === provider).value
  return provider.getNormalizedMessageStatusData(event)
}