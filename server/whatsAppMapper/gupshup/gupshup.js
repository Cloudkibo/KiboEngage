const { gupshupApiCaller } = require('../../api/global/gupshupApiCaller')
const logicLayer = require('./logiclayer')
const logger = require('../../components/logger')
const TAG = 'whatsAppMapper/gupshup/gupshup.js'
const utility = require('../../api/v1.1/utility')

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
    gupshupApiCaller(`template/list/${body.whatsApp.appName}`, 'get', body.whatsApp.accessToken)
      .then(result => {
        if (result.body && result.body.status === 'success') {
          let templates = logicLayer.prepareTemplates(result.body.templates)
          resolve(templates)
        } else {
          resolve([])
        }
      })
      .catch((err) => {
        reject(err)
      })
  })
}
exports.sendBroadcastMessages = (body) => {
  return new Promise((resolve, reject) => {
    let requests = []
    for (let i = 0; i < body.payload.length; i++) {
      for (let j = 0; j < body.contacts.length; j++) {
        requests.push(new Promise((resolve, reject) => {
          setTimeout(() => {
            let { route, MessageObject } = logicLayer.prepareSendMessagePayload(body.whatsApp, body.contacts[j], body.payload[i])
            gupshupApiCaller(route, 'post',
              body.whatsApp.accessToken,
              MessageObject)
              .then(response => {
                let messageId = getMessageId(response, body)
                if (messageId) {
                  resolve('success')
                  let MessageObject = logicLayer.prepareChat(body, body.contacts[j], body.payload[i])
                  utility.callApi(`whatsAppChat`, 'post', MessageObject, 'kibochat')
                    .then(response => {
                    })
                    .catch(error => {
                      const message = error || 'Failed to save broadcast'
                      logger.serverLog(message, `${TAG}: exports.sendBroadcastMessages`, body, {}, 'error')
                    })
                  if (i === body.payload.length - 1) {
                    saveWhatsAppBroadcastMessages(messageId, body, body.contacts[j])
                  }
                } else {
                  resolve('success')
                }
              })
              .catch(error => {
                resolve('success')
                const message = error || '`error at sending message'
                logger.serverLog(message, `${TAG}: exports.sendBroadcastMessages`, body, {}, 'error')
              })
          }, ((body.contacts.length) * i + (j + 1)) * 1000)
        }))
      }
    }
    Promise.all(requests)
      .then((responses) => {
        resolve()
      })
      .catch((err) => {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.sendBroadcastMessages`, body, {}, 'error')
        reject(err)
      })
  })
}

function getMessageId (response, body) {
  let messageId
  if (response.body.messageId) {
    messageId = response.body.messageId
  } else {
    try {
      let parsedResponse = JSON.parse(response.body)
      if (parsedResponse.messageId) {
        messageId = parsedResponse.messageId
      } else {
        messageId = undefined
      }
    } catch (err) {
      messageId = undefined
    }
  }
  return messageId
}

function saveWhatsAppBroadcastMessages (messageId, body, contact) {
  let dataToInsert = {
    userId: body.userId,
    companyId: body.companyId,
    subscriberNumber: contact.number,
    broadcastId: body.broadcastId,
    messageId: messageId
  }
  utility.callApi(`whatsAppBroadcastMessages`, 'post', dataToInsert, 'kiboengage') // fetch company user
    .then(result => {
    })
    .catch(error => {
      const message = error || 'Failed to save broadcast messages'
      logger.serverLog(message, `${TAG}: saveWhatsAppBroadcastMessages`, body, {}, 'error')
    })
}
exports.sendInvitationTemplate = (body) => {
  return new Promise((resolve, reject) => {
    let requests = []
    for (let j = 0; j < body.numbers.length; j++) {
      requests.push(new Promise((resolve, reject) => {
        setTimeout(() => {
          gupshupApiCaller(`template/msg`, 'post',
            body.whatsApp.accessToken,
            logicLayer.prepareInvitationPayload(body, body.numbers[j]))
            .then(response => {
              let messageId = getMessageId(response, body)
              if (messageId) {
                resolve('success')
              } else {
                resolve()
              }
            })
            .catch(error => {
              const message = error || 'Error while sending invitation message'
              logger.serverLog(message, `${TAG}: exports.sendInvitationTemplate`, {}, {body}, 'error')
              resolve()
            })
        }, 1000)
      }))
    }
    Promise.all(requests)
      .then((responses) => {
        resolve()
      })
      .catch((err) => reject(err))
  })
}

exports.getNormalizedMessageStatusData = (event) => {
  return {
    messageId: event.payload.gsId,
    status: event.payload.type === 'read' ? 'seen' : event.payload.type
  }
}
