const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/pollResponse.controller.js'
const PollResponseDataLayer = require('../polls/pollresponse.datalayer')
const PollsDataLayer = require('../polls/polls.datalayer')
const needle = require('needle')
const sequenceController = require('./sequence.controller')
const notificationsUtility = require('../notifications/notifications.utility')
const {callApi} = require('../utility')
const { saveLiveChat, preparePayloadFacebook } = require('../../global/livechat')

var array = []

exports.pollResponse = function (req, res) {
  logger.serverLog(TAG, `in pollResponse ${JSON.stringify(req.body)}`)
  let resp = JSON.parse(req.body.entry[0].messaging[0].message.quick_reply.payload)
  PollsDataLayer.findOnePoll(resp.poll_id)
    .then(poll => {
      callApi(`subscribers/query`, 'post', { senderId: req.body.entry[0].messaging[0].sender.id, companyId: poll.companyId })
        .then(subscribers => {
          let subscriber = subscribers[0]
          if (subscriber) {
            let message = preparePayloadFacebook(subscriber, subscriber.pageId, {componentType: 'text', text: req.body.entry[0].messaging[0].message.text})
            saveLiveChat(message)
            savepoll(req.body.entry[0].messaging[0], resp, subscriber)
              .then(response => {
                logger.serverLog(TAG, `Subscriber Responeds to Poll ${JSON.stringify(subscriber)} ${resp.poll_id}`, 'debug')
                sequenceController.resposndsToPoll({companyId: poll.companyId, subscriberId: subscriber._id, pollId: resp.poll_id})
                return res.status(200).json({
                  status: 'success',
                  description: `received the payload`
                })
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to save poll response ${JSON.stringify(err)}`, 'error')
                return res.status(500).json({status: 'failed', description: `Failed to fetch subscriber ${err}`})
              })
          } else {
            return res.status(500).json({
              status: 'failed',
              description: `no subscriber found`
            })
          }
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(err)}`, 'error')
          return res.status(500).json({status: 'failed', description: `Failed to fetch subscriber ${err}`})
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch poll ${JSON.stringify(err)}`, 'error')
      return res.status(500).json({status: 'failed', description: `Failed to fetch poll ${err}`})
    })
}
function savepoll (req, resp, subscriber) {
  // find subscriber from sender id
  // var resp = JSON.parse(req.postback.payload)
  var temp = true
  if (!subscriber || subscriber._id === null) {
    return
  }
  if (array.length > 0) {
    for (var i = 0; i < array.length; i++) {
      if (array[i].pollId ===
        resp.poll_id &&
        array[i].subscriberId ===
        subscriber._id) {
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
      logger.serverLog(TAG, `webhook ${webhook}`, 'debug')
      if (webhook && webhook.isEnabled) {
        needle.get(webhook.webhook_url, (err, r) => {
          if (err) {
            logger.serverLog(TAG, err, 'error')
            logger.serverLog(TAG, `response ${r.statusCode}`, 'error')
          } else if (r.statusCode === 200) {
            if (webhook && webhook.optIn.POLL_RESPONSE) {
              var data = {
                subscription_type: 'POLL_RESPONSE',
                payload: JSON.stringify({ sender: req.sender, recipient: req.recipient, timestamp: req.timestamp, message: req.message })
              }
              logger.serverLog(TAG, `data for poll response ${data}`, 'debug')
              needle.post(webhook.webhook_url, data,
                (error, response) => {
                  if (error) logger.serverLog(TAG, err, 'error')
                })
            }
          } else {
            notificationsUtility.saveNotification(webhook)
          }
        })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
    })
  if (temp === true) {
    PollResponseDataLayer.createForPollResponse(pollbody)
      .then(pollresponse => {
        array.push(pollbody)
      })
      .catch(err => {
        logger.serverLog(TAG, `Failed to create poll response ${JSON.stringify(err)}`, 'error')
      })
  }
}
