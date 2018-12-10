const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/pollResponse.controller.js'
const mongoose = require('mongoose')
const PollResponseDataLayer = require('../polls/pollresponse.datalayer')
const needle = require('needle')
const sequenceController = require('../sequenceMessaging/sequence.controller')
const notificationsUtility = require('../notifications/notifications.utility')
const {callApi} = require('../utility')

var array = []

exports.pollResponse = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  logger.serverLog(TAG, `in pollResponse ${JSON.stringify(req.body)}`)
  let resp = JSON.parse(
    req.body.entry[0].messaging[0].message.quick_reply.payload)
  savepoll(req.body.entry[0].messaging[0], resp)
  callApi(`subscribers/query`, 'post', { senderId: req.body.entry[0].messaging[0].sender.id })
    .then(subscribers => {
      let subscriber = subscribers[0]
      if (subscriber) {
        logger.serverLog(TAG, `Subscriber Responeds to Poll ${JSON.stringify(subscriber)} ${resp.poll_id}`)
        sequenceController.setSequenceTrigger(subscriber.companyId, subscriber._id, { event: 'responds_to_poll', value: resp.poll_id })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(err)}`)
    })
}
function savepoll (req, resp) {
  // find subscriber from sender id
  // var resp = JSON.parse(req.postback.payload)
  var temp = true
  callApi(`subscribers/query`, 'post', { senderId: req.sender.id })
    .then(subscribers => {
      let subscriber = subscribers[0]
      if (!subscriber || subscriber._id === null) {
        return
      }
      if (array.length > 0) {
        for (var i = 0; i < array.length; i++) {
          if (mongoose.Types.ObjectId(array[i].pollId) ===
            mongoose.Types.ObjectId(resp.poll_id) &&
            mongoose.Types.ObjectId(array[i].subscriberId) ===
            mongoose.Types.ObjectId(subscriber._id)) {
            temp = false
            break
          }
        }
      }
      const pollbody = {
        response: resp.option, // response submitted by subscriber
        pollId: resp.poll_id,
        subscriberId: subscriber._id
      }
      callApi(`webhooks/query`, 'post', { pageId: req.recipient.id })
        .then(webhook => {
          logger.serverLog(TAG, `webhook ${webhook}`)
          if (webhook && webhook.isEnabled) {
            needle.get(webhook.webhook_url, (err, r) => {
              if (err) {
                logger.serverLog(TAG, err)
                logger.serverLog(TAG, `response ${r.statusCode}`)
              } else if (r.statusCode === 200) {
                if (webhook && webhook.optIn.POLL_RESPONSE) {
                  var data = {
                    subscription_type: 'POLL_RESPONSE',
                    payload: JSON.stringify({ sender: req.sender, recipient: req.recipient, timestamp: req.timestamp, message: req.message })
                  }
                  logger.serverLog(TAG, `data for poll response ${data}`)
                  needle.post(webhook.webhook_url, data,
                    (error, response) => {
                      if (error) logger.serverLog(TAG, err)
                    })
                }
              } else {
                notificationsUtility.saveNotification(webhook)
              }
            })
          }
        })
        .catch(err => {
          logger.serverLog(TAG, err)
        })
      if (temp === true) {
        PollResponseDataLayer.createForPollResponse(pollbody)
          .then(pollresponse => {
            array.push(pollbody)
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to create poll response ${JSON.stringify(err)}`)
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(err)}`)
    })
}
