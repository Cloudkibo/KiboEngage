const twilio = require('./twilio')
const bandwidth = require('./bandwidth')
const { ActionTypes } = require('./constants')

const providers = [
  { key: 'twilio', value: twilio },
  { key: 'bandwidth', value: bandwidth }
]

exports.smsMapper = (provider, action, data) => {
  provider = providers.find(a => a.key === provider).value
  return callAction(action, data, provider)
}

function callAction (action, data, provider) {
  switch (action) {
    case ActionTypes.VERIFY_CREDENTIALS:
      return provider.verifyCredentials(data)
    case ActionTypes.SET_WEBHOOK:
      return provider.setWebhook(data)
    case ActionTypes.CREATE_ORDER:
      return provider.createOrder(data)
    case ActionTypes.FETCH_AVAILABLE_NUMBERS:
      return provider.fetchAvailableNumbers(data)
    default:
  }
}
