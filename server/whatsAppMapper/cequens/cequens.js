const logicLayer = require('./logiclayer')
const { cequensApiCaller } = require('../../api/global/cequensApiCaller')
const logger = require('../../components/logger')
const TAG = 'whatsAppMapper/cequens/cequens.js'
const utility = require('../../api/v1.1/utility')
const async = require('async')

exports.setWebhook = (body) => {
  return new Promise((resolve, reject) => {
    async.parallelLimit([
      function (callback) {
        cequensApiCaller('webhook',
          'put',
          body.accessToken,
          {url: `https://webhook.cloudkibo.com/webhooks/cequens/${body.businessNumber}`,
            type: 'status'})
          .then(response => {
            if (response.body.data) {
              callback()
            } else {
              callback(response.body)
            }
          })
          .catch(error => {
            reject(error)
          })
      },
      function (callback) {
        cequensApiCaller('webhook',
          'put',
          body.accessToken,
          {url: `https://webhook.cloudkibo.com/webhooks/cequens/${body.businessNumber}`,
            type: 'message'})
          .then(response => {
            if (response.body.data) {
              callback()
            } else {
              callback(response.body)
            }
          })
          .catch(error => {
            reject(error)
          })
      }
    ], 10, function (err, results) {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
exports.verifyCredentials = (body) => {
  return new Promise((resolve, reject) => {
    cequensApiCaller(`credentials/${body.businessNumber}`,
      'get',
      body.accessToken)
      .then(response => {
        if (response.body.data && response.body.data.status && response.body.data.status === 'valid') {
          resolve()
        } else {
          reject(Error('Cequens account not found. Please enter correct details'))
        }
      })
      .catch(error => {
        reject(error)
      })
  })
}
exports.getTemplates = (body) => {
  return new Promise((resolve, reject) => {
    cequensApiCaller(`templates`,
      'get',
      body.whatsApp.accessToken)
      .then(response => {
        if (response.body && response.body.data) {
          let templates = logicLayer.prepareTemplates(response.body.data.commercialTemplates)
          resolve(templates)
        } else {
          reject(response.body)
        }
      })
      .catch(error => {
        reject(error)
      })
  })
}
exports.sendInvitationTemplate = (body) => {
  return new Promise(async (resolve, reject) => {
    const namespaceResponse = await cequensApiCaller('templates/namespace', 'get', body.whatsApp.accessToken)
    const namespace = namespaceResponse.body.data && namespaceResponse.body.data.message_template_namespace
    let requests = []
    for (let j = 0; j < body.numbers.length; j++) {
      requests.push(new Promise((resolve, reject) => {
        setTimeout(() => {
          cequensApiCaller('messages',
            'post',
            body.whatsApp.accessToken,
            logicLayer.prepareInvitationPayload(body, body.numbers[j], namespace))
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
  return new Promise(async (resolve, reject) => {
    const namespaceResponse = await cequensApiCaller('templates/namespace', 'get', body.whatsApp.accessToken)
    const namespace = namespaceResponse.body.data && namespaceResponse.body.data.message_template_namespace
    let requests = []
    for (let i = 0; i < body.payload.length; i++) {
      for (let j = 0; j < body.contacts.length; j++) {
        requests.push(new Promise((resolve, reject) => {
          setTimeout(() => {
            cequensApiCaller('messages',
              'post',
              body.whatsApp.accessToken,
              logicLayer.prepareSendMessagePayload(body.whatsApp, body.contacts[j], body.payload[i], namespace))
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
