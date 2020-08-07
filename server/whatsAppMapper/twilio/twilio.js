const needle = require('needle')
const logicLayer = require('./logiclayer')
const utility = require('../../api/v1.1/utility')
const logger = require('../../components/logger')
const TAG = 'whatsAppMapper/flocksend.js'

exports.setWebhook = (body) => {
  return new Promise((resolve, reject) => {
    resolve()
  })
}
exports.verifyCredentials = (body) => {
  return new Promise((resolve, reject) => {
    needle('get', `https://${body.accountSID}:${body.accessToken}@api.twilio.com/2010-04-01/Accounts`)
      .then(resp => {
        if (resp.statusCode === 200) {
          resolve()
        } else {
          reject(Error('Twilio account not found. Please enter correct details'))
        }
      })
      .catch((err) => {
        reject(err)
      })
  })
}
exports.getTemplates = (body) => {
  return new Promise((resolve, reject) => {
    let templates = logicLayer.prepareTemplates()
    resolve(templates)
  })
}
exports.sendBroadcastMessages = (body) => {
  return new Promise((resolve, reject) => {
    let accountSid = body.whatsApp.accountSID
    let authToken = body.whatsApp.accessToken
    let client = require('twilio')(accountSid, authToken)
    let requests = []
    for (let i = 0; i < body.payload.length; i++) {
      for (let j = 0; j < body.contacts.length; j++) {
        requests.push(new Promise((resolve, reject) => {
          setTimeout(() => {
            client.messages
              .create(logicLayer.prepareSendMessagePayload(body.whatsApp, body.contacts[j], body.payload[i]))
              .then(response => {
                resolve('success')
                let MessageObject = logicLayer.prepareChat(body, body.contacts[j], body.payload[i])
                utility.callApi(`whatsAppChat`, 'post', MessageObject, 'kibochat')
                  .then(response => {
                  })
                  .catch(error => {
                    reject(new Error('fail'))
                    logger.serverLog(TAG, `Failed to save broadcast ${error}`, 'error')
                  })
                if (i === body.payload.length - 1 && response.sid) {
                  saveWhatsAppBroadcastMessages(response, body, body.contacts[j])
                }
              })
              .catch(error => {
                logger.serverLog(TAG, `error at sending message ${error}`, 'error')
              })
          }, ((body.contacts.length) * i + (j + 1)) * 1000)
        }))
      }
    }
    Promise.all(requests)
      .then((responses) => {
        resolve()
      })
      .catch((err) => reject(err))
  })
}
function saveWhatsAppBroadcastMessages (resp, body, contact) {
  let dataToInsert = {
    userId: body.userId,
    companyId: body.companyId,
    subscriberNumber: contact.number,
    broadcastId: body.broadcastId,
    messageId: resp.sid
  }
  utility.callApi(`whatsAppBroadcastMessages`, 'post', dataToInsert, 'kiboengage') // fetch company user
    .then(result => {
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to save broadcast messages ${error}`, 'error')
    })
}
exports.sendInvitationTemplate = (body) => {
  return new Promise((resolve, reject) => {
    let accountSid = body.whatsApp.accountSID
    let authToken = body.whatsApp.accessToken
    let client = require('twilio')(accountSid, authToken)
    let requests = []
    for (let j = 0; j < body.numbers.length; j++) {
      requests.push(new Promise((resolve, reject) => {
        setTimeout(() => {
          client.messages
            .create(logicLayer.prepareInvitationPayload(body, body.numbers[j]))
            .then(response => {
              resolve('success')
            })
            .catch(error => {
              logger.serverLog(TAG, `error at sending message ${error}`, 'error')
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
  return new Promise((resolve, reject) => {
    try {
      resolve({
        messageId: event.MessageSid,
        status: event.MessageStatus === 'read' ? 'seen' : event.MessageStatus
      })
    } catch (err) {
      reject(err)
    }
  })
}
