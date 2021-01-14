const logicLayer = require('./logiclayer')
const { cequensApiCaller } = require('../../api/global/cequensApiCaller')
const logger = require('../../components/logger')
const TAG = 'whatsAppMapper/cequens/cequens.js'
const utility = require('../../api/v1.1/utility')

exports.setWebhook = (body) => {
  return new Promise((resolve, reject) => {
    resolve()
  })
}
exports.verifyCredentials = (body) => {
  return new Promise((resolve, reject) => {
    resolve()
  })
}
exports.getTemplates = (body) => {
  return new Promise((resolve, reject) => {
    let templates = logicLayer.prepareTemplates()
    resolve(templates)
  })
}
exports.sendInvitationTemplate = (body) => {
  return new Promise((resolve, reject) => {
    let requests = []
    for (let j = 0; j < body.numbers.length; j++) {
      requests.push(new Promise((resolve, reject) => {
        setTimeout(() => {
          cequensApiCaller('messages',
            body.whatsApp.clientName,
            body.whatsApp.businessNumber,
            'post',
            body.whatsApp.accessToken,
            logicLayer.prepareInvitationPayload(body, body.numbers[j]))
            .then(response => {
              if (response.body.errors) {
                const message = response.body.errors.title || 'Error while sending invitation message'
                logger.serverLog(message, `${TAG}: exports.sendInvitationTemplate`, {}, {body}, 'error')
                resolve()
              } else {
                resolve('success')
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
exports.sendBroadcastMessages = (body) => {
  return new Promise((resolve, reject) => {
    let requests = []
    for (let i = 0; i < body.payload.length; i++) {
      for (let j = 0; j < body.contacts.length; j++) {
        requests.push(new Promise((resolve, reject) => {
          setTimeout(() => {
            cequensApiCaller('messages',
              body.whatsApp.clientName,
              body.whatsApp.businessNumber,
              'post',
              body.whatsApp.accessToken,
              logicLayer.prepareSendMessagePayload(body.whatsApp, body.contacts[j], body.payload[i]))
              .then(response => {
                if (response.body.errors) {
                  const message = response.body.errors.title || 'Error while sending broadcast message'
                  logger.serverLog(message, `${TAG}: exports.sendBroadcastMessages`, {}, {body}, 'error')
                  resolve('success')
                } else {
                  resolve('success')
                  let MessageObject = logicLayer.prepareChat(body, body.contacts[j], body.payload[i])
                  utility.callApi(`whatsAppChat`, 'post', MessageObject, 'kibochat')
                    .then(response => {
                    })
                    .catch(error => {
                      const message = error || 'Failed to save broadcast'
                      logger.serverLog(message, `${TAG}: exports.sendBroadcastMessages`, body, {}, 'error')
                    })
                  if (i === body.payload.length - 1 && response.body.messages && response.body.messages.length > 0) {
                    saveWhatsAppBroadcastMessages(response, body, body.contacts[j])
                  }
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
function saveWhatsAppBroadcastMessages (resp, body, contact) {
  let dataToInsert = {
    userId: body.userId,
    companyId: body.companyId,
    subscriberNumber: contact.number,
    broadcastId: body.broadcastId,
    messageId: resp.body.messages[0].id
  }
  utility.callApi(`whatsAppBroadcastMessages`, 'post', dataToInsert, 'kiboengage') // fetch company user
    .then(result => {
    })
    .catch(error => {
      const message = error || 'Failed to save broadcast messages'
      logger.serverLog(message, `${TAG}: saveWhatsAppBroadcastMessages`, body, {}, 'error')
    })
}
exports.getNormalizedMessageStatusData = (event) => {
  return {
    messageId: event.statuses[0].id,
    status: event.statuses[0].status === 'read' ? 'seen' : event.statuses[0].status
  }
}
