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
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.verifyCredentials`, body, {}, 'error')
        reject(err)
      })
  })
}

exports.checkTwillioVersion = (body) => {
  return new Promise((resolve, reject) => {
    needle('get', `https://${body.accountSID}:${body.accessToken}@api.twilio.com/2010-04-01/Accounts/${body.accountSID}.json`)
      .then(resp => {
        let data = {
          twilioVersionResponse: null,
          businessNumbers: []
        }
        if (resp.statusCode === 200) {
          data.twilioVersionResponse = resp
          if (resp.body.type === 'Trial') {
            resolve(data)
          } else {
            needle('get', `https://${body.accountSID}:${body.accessToken}@api.twilio.com/2010-04-01/Accounts/${body.accountSID}/IncomingPhoneNumbers.json`)
              .then(businessNumbersInfo => {
                let businessNumbers = businessNumbersInfo.body.incoming_phone_numbers.map(numberInfo => numberInfo.phone_number)
                data.businessNumbers = businessNumbers
                resolve(data)
              })
          }
        } else {
          reject(Error('Error in finding twilio version'))
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
                    const message = error || 'Failed to save broadcast'
                    logger.serverLog(message, `${TAG}: exports.sendBroadcastMessages`, body, {}, 'error')
                    reject(new Error('fail'))
                  })
                if (i === body.payload.length - 1 && response.sid) {
                  saveWhatsAppBroadcastMessages(response, body, body.contacts[j])
                }
              })
              .catch(error => {
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
    messageId: resp.sid
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
              const message = error || 'error at sending message'
              logger.serverLog(message, `${TAG}: exports.sendInvitationTemplate`, body, {}, 'error')
            })
        }, 1000)
      }))
    }
    Promise.all(requests)
      .then((responses) => {
        resolve()
      })
      .catch((err) => {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.sendInvitationTemplate`, body, {}, 'error')
        reject(err)
      })
  })
}

exports.getNormalizedMessageStatusData = (event) => {
  return {
    messageId: event.MessageSid,
    status: event.MessageStatus === 'read' ? 'seen' : event.MessageStatus
  }
}
