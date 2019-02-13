const logger = require('../../../components/logger')
const TAG = 'api/messengerEvents/menu.controller.js'
const {callApi} = require('../utility')
const logicLayer = require('./logiclayer')
const request = require('request')
const broadcastUtility = require('../broadcasts/broadcasts.utility')

exports.index = function (req, res) {
  console.log('in menu controller')
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let replyPayload = JSON.parse(req.body.entry[0].messaging[0].postback.payload)
  const sender = req.body.entry[0].messaging[0].sender.id
  const pageId = req.body.entry[0].messaging[0].recipient.id
  callApi(`pages/query`, 'post', { pageId: pageId, connected: true })
    .then(page => {
      page = page[0]
      callApi(`subscribers/query`, 'post', { pageId: page._id, senderId: sender })
        .then(subscriber => {
          subscriber = subscriber[0]
          if (subscriber) {
            //  sendMenuReplyToSubscriber(replyPayload, subscriber.senderId, subscriber.firstName, subscriber.lastName, subscriber.pageId.accessToken)
            broadcastUtility.getBatchData(replyPayload, subscriber.senderId, page, sendBroadcast, subscriber.firstName, subscriber.lastName, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
          }
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`)
    })
}

function sendMenuReplyToSubscriber (replyPayload, senderId, firstName, lastName, accessToken) {
  console.log('replyPayload', replyPayload)
  for (let i = 0; i < replyPayload.length; i++) {
    logicLayer.prepareSendAPIPayload(senderId, replyPayload[i], firstName, lastName, true)
      .then(result => {
        console.log('result from file', result)
        // let messageData = logicLayer.prepareSendAPIPayload(senderId, replyPayload[i], firstName, lastName, true)
        // logger.serverLog(TAG, `messageData ${JSON.stringify(messageData)}`)
        // console.log('messageData in sendMenuReplyToSubscriber', messageData)
        console.log('accessToken in sendMenuReplyToSubscriber', accessToken)
        request(
          {
            'method': 'POST',
            'json': true,
            'formData': result.payload,
            'uri': 'https://graph.facebook.com/v2.6/me/messages?access_token=' + accessToken
          },
          (err, res) => {
            console.log(`At sendMenuReplyToSubscriber response ${JSON.stringify(res)}`)
            if (err) {
              console.log('error', err)
            } else {
              if (res.statusCode !== 200) {
                logger.serverLog(TAG,
                  `At send message landingPage ${JSON.stringify(
                    res.body.error)}`)
              }
              logger.serverLog(TAG, `At sendMenuReplyToSubscriber response ${JSON.stringify(res.body)}`)
              console.log(`At sendMenuReplyToSubscriber response ${JSON.stringify(res.body)}`)
            }
          })
      })
  }
}
const sendBroadcast = (batchMessages, page, res, subscriberNumber, subscribersLength, testBroadcast) => {
  const r = request.post('https://graph.facebook.com', (err, httpResponse, body) => {
    console.log('Send Response Broadcast', body)
    if (err) {
      logger.serverLog(TAG, `Batch send error ${JSON.stringify(err)}`)
      console.log(`Batch send error ${JSON.stringify(err)}`)
      // return res.status(500).json({
      //   status: 'failed',
      //   description: `Failed to send broadcast ${JSON.stringify(err)}`
      // })
    }
  })
  const form = r.form()
  form.append('access_token', page.accessToken)
  form.append('batch', batchMessages)
}
