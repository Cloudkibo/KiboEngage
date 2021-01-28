const { gupshupApiCaller } = require('../../api/global/gupshupApiCaller')

exports.setWebhook = (body) => {
  return new Promise((resolve, reject) => {
    resolve()
  })
}
exports.verifyCredentials = (body) => {
  return new Promise((resolve, reject) => {
    gupshupApiCaller(`template/list/${body.appName}`, 'get', body.accessToken)
      .then(result => {
        if (result.body && result.body.status === 'success') {
          resolve()
        } else {
          reject(Error('You have entered incorrect credentials. Please enter correct gupshup credentials'))
        }
      })
      .catch((err) => {
        reject(err)
      })
  })
}
exports.getTemplates = (body) => {
  return new Promise((resolve, reject) => {
    resolve([])
  })
}

exports.getNormalizedMessageStatusData = (event) => {
  return {
    messageId: event.payload.id,
    status: event.payload.type === 'read' ? 'seen' : event.payload.type
  }
}