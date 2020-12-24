const logicLayer = require('./logiclayer')
const { flockSendApiCaller } = require('../../api/global/flockSendApiCaller')
const utility = require('../../api/v1.1/utility')
const async = require('async')
const logger = require('../../components/logger')
const TAG = 'whatsAppMapper/flocksend.js'

exports.sendBroadcastMessages = (body) => {
  return new Promise((resolve, reject) => {
    let contactNumbers = []
    body.contacts.map((c) => contactNumbers.push({ phone: c.number }))
    async.eachOfSeries(body.payload, function (value, key, callback) {
      if (key < body.payload.length) {
        let { route, MessageObject } = logicLayer.prepareSendMessagePayload(body, contactNumbers, value)
        flockSendApiCaller(`connect/official/v2/${route}`, 'post', MessageObject)
          .then(response => {
            let parsed = JSON.parse(response.body)
            if (parsed.code !== 200) {
              callback(parsed.message)
            } else {
              callback()
              for (let j = 0; j < body.contacts.length; j++) {
                let MessageObject = logicLayer.prepareChat(body, body.contacts[j], value)
                utility.callApi(`whatsAppChat`, 'post', MessageObject, 'kibochat')
                  .then(response => {
                  })
                  .catch(error => {
                    const message = error || 'Failed to save broadcast'
                    logger.serverLog(message, `${TAG}: exports.sendBroadcastMessages`, body, {}, 'error')
                  })
              }
              if (key === body.payload.length - 1 && parsed.data.length > 0) {
                saveWhatsAppBroadcastMessages(parsed.data, body)
              }
            }
          })
          .catch(error => {
            const message = error || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: exports.sendBroadcastMessages`, body, {}, 'error')
            callback(error)
          })
      } else {
        callback()
      }
    }, function (err) {
      if (err) {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.sendBroadcastMessages`, body, {}, 'error')
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
function saveWhatsAppBroadcastMessages (data, body) {
  let dataToInsert = []
  data.forEach(value => {
    dataToInsert.push({
      userId: body.userId,
      companyId: body.companyId,
      subscriberNumber: value.phone_number,
      broadcastId: body.broadcastId,
      messageId: value.id
    })
  })
  utility.callApi(`whatsAppBroadcastMessages/insert`, 'post', dataToInsert, 'kiboengage') // fetch company user
    .then(companyUser => {
    })
    .catch(error => {
      const message = error || 'Failed to save broadcast messages'
      logger.serverLog(message, `${TAG}: saveWhatsAppBroadcastMessages`, body, {}, 'error')
    })
}
exports.getTemplates = (body) => {
  return new Promise((resolve, reject) => {
    const authData = {
      'token': body.whatsApp.accessToken
    }
    flockSendApiCaller('templates-fetch', 'post', authData)
      .then(resp => {
        let templates = logicLayer.prepareTemplates(resp.body)
        resolve(templates)
      })
      .catch((err) => {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.getTemplates`, body, {}, 'error')
        reject(err)
      })
  })
}
exports.sendInvitationTemplate = (body) => {
  return new Promise((resolve, reject) => {
    let MessageObject = logicLayer.prepareInvitationPayload(body)
    flockSendApiCaller('connect/official/v2/hsm', 'post', MessageObject)
      .then(response => {
        let parsed = JSON.parse(response.body)
        if (parsed.code !== 200) {
          reject(parsed.message)
        } else {
          resolve()
        }
      })
      .catch((err) => {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.sendInvitationTemplate`, body, {}, 'error')
        reject(err)
      })
  })
}

exports.getNormalizedMessageStatusData = (event) => {
  return new Promise((resolve, reject) => {
    try {
      resolve({
        messageId: event.id,
        status: event.status
      })
    } catch (err) {
      reject(err)
    }
  })
}

exports.setWebhook = (body) => {
  return new Promise((resolve, reject) => {
    async.parallelLimit([
      function (callback) {
        flockSendApiCaller('update-send-message-webhook', 'post', {
          token: body.accessToken,
          webhook_url: 'https://webhook.cloudkibo.com/webhooks/flockSend',
          webhook_status: 1
        })
          .then(response => {
            callback()
          })
          .catch((err) => {
            const message = err || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: exports.setWebhook`, body, {}, 'error')
            reject(err)
          })
      },
      function (callback) {
        flockSendApiCaller('update-listen-webhook', 'post', {
          token: body.accessToken,
          webhook_url: 'https://webhook.cloudkibo.com/webhooks/flockSend',
          webhook_status: 1
        })
          .then(response => {
            callback()
          })
          .catch((err) => {
            const message = err || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: exports.setWebhook`, body, {}, 'error')
            reject(err)
          })
      }
    ], 10, function (err, results) {
      if (err) {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.setWebhook`, body, {}, 'error')
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

exports.verifyCredentials = (body) => {
  return new Promise((resolve, reject) => {
    const authData = {
      'token': body.accessToken
    }
    flockSendApiCaller('templates-fetch', 'post', authData)
      .then(resp => {
        if (!Array.isArray(resp.body)) {
          resp.body = JSON.parse(resp.body)
        }
        if (resp && resp.body && resp.body.code === 198 && resp.body.message === 'Invalid token') {
          reject(Error('You have entered invalid Flock send access token. Please enter correct Flock send access token'))
        } else {
          resolve(resp)
        }
      })
      .catch((err) => {
        reject(err)
      })
  })
}
