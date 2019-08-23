const logger = require('../../../components/logger')
const TAG = 'api/messengerEvents/menu.controller.js'
const {callApi} = require('../utility')
const logicLayer = require('./logiclayer')
const request = require('request')
const broadcastUtility = require('../broadcasts/broadcasts.utility')
const messengerEventsUtility = require('./utility')
let { sendOpAlert } = require('./../../global/operationalAlert')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  console.log('req.body in menu controller', req.body)
  let replyPayload = JSON.parse(req.body.entry[0].messaging[0].postback.payload)
  const sender = req.body.entry[0].messaging[0].sender.id
  const pageId = req.body.entry[0].messaging[0].recipient.id
  callApi(`pages/query`, 'post', { pageId: pageId, connected: true })
    .then(page => {
      page = page[0]
      callApi(`subscribers/query`, 'post', { pageId: page._id, companyId: page.companyId, senderId: sender })
        .then(subscriber => {
          subscriber = subscriber[0]
          if (subscriber) {
            //  sendMenuReplyToSubscriber(replyPayload, subscriber.senderId, subscriber.firstName, subscriber.lastName, subscriber.pageId.accessToken)
            broadcastUtility.getBatchData(replyPayload, subscriber.senderId, page, messengerEventsUtility.sendBroadcast, subscriber.firstName, subscriber.lastName, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
          }
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(err)}`, 'error')
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`, 'error')
    })
}

function sendMenuReplyToSubscriber (replyPayload, senderId, firstName, lastName, accessToken) {
  for (let i = 0; i < replyPayload.length; i++) {
    logicLayer.prepareSendAPIPayload(senderId, replyPayload[i], firstName, lastName, true)
      .then(result => {
        // let messageData = logicLayer.prepareSendAPIPayload(senderId, replyPayload[i], firstName, lastName, true)
        // logger.serverLog(TAG, `messageData ${JSON.stringify(messageData)}`)
        // console.log('messageData in sendMenuReplyToSubscriber', messageData)
        request(
          {
            'method': 'POST',
            'json': true,
            'formData': result.payload,
            'uri': 'https://graph.facebook.com/v2.6/me/messages?access_token=' + accessToken
          },
          (err, res) => {
            if (err) {
            } else {
              if (res.body.error) {
                sendOpAlert(res.body.error, 'Menu controller in KiboEngage')
              }
              if (res.statusCode !== 200) {
                logger.serverLog(TAG,
                  `At send message landingPage ${JSON.stringify(
                    res.body.error)}`, 'error')
              }
              logger.serverLog(TAG, `At sendMenuReplyToSubscriber response ${JSON.stringify(res.body)}`)
            }
          })
      })
  }
}
