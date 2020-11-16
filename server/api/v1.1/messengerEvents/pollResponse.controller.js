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
  let resp = JSON.parse(req.body.entry[0].messaging[0].message.quick_reply.payload)
  if (resp.poll_id) {
    PollsDataLayer.findOnePoll(resp.poll_id)
      .then(poll => {
        if (poll) {
          callApi(`subscribers/query`, 'post', { senderId: req.body.entry[0].messaging[0].sender.id, companyId: poll.companyId, completeInfo: true })
            .then(subscribers => {
              let subscriber = subscribers[0]
              console.log('subscriber found', JSON.stringify(subscriber))
              if (subscriber) {
                let message = preparePayloadFacebook(subscriber, subscriber.pageId, {componentType: 'text', text: req.body.entry[0].messaging[0].message.text})
                saveLiveChat(message)
                savepoll(req.body.entry[0].messaging[0], resp, subscriber)
                sequenceController.handlePollSurveyResponse({companyId: poll.companyId, subscriberId: subscriber._id, payload: resp})
                return res.status(200).json({
                  status: 'success',
                  description: `received the payload`
                })
              } else {
                return res.status(500).json({
                  status: 'failed',
                  description: `no subscriber found`
                })
              }
            })
            .catch(err => {
              return res.status(500).json({status: 'failed', description: `Failed to fetch subscriber ${err}`})
            })
        }
      })
      .catch(err => {
        const message = err || 'Failed to fetch poll'
        logger.serverLog(message, `${TAG}: exports.pollResponse`, req.body, {user: req.user}, 'error')
        return res.status(500).json({status: 'failed', description: `Failed to fetch poll ${err}`})
      })
  }
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
      if (webhook && webhook.isEnabled) {
        needle.get(webhook.webhook_url, (err, r) => {
          if (err) {
            const message = err || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: savepoll`, req.body, {user: req.user}, 'error')
          } else if (r.statusCode === 200) {
            if (webhook && webhook.optIn.POLL_RESPONSE) {
              var data = {
                subscription_type: 'POLL_RESPONSE',
                payload: JSON.stringify({ sender: req.sender, recipient: req.recipient, timestamp: req.timestamp, message: req.message })
              }
              needle.post(webhook.webhook_url, data,
                (error, response) => {
                  if (error) {
                    const message = err || 'Internal Server Error'
                    logger.serverLog(message, `${TAG}: savepoll`, req.body, {user: req.user}, 'error')
                  }
                })
            }
          } else {
            notificationsUtility.saveNotification(webhook)
          }
        })
      }
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: savepoll`, req.body, {user: req.user}, 'error')
    })
  if (temp === true) {
    PollResponseDataLayer.createForPollResponse(pollbody)
      .then(pollresponse => {
        array.push(pollbody)
      })
      .catch(err => {
        const message = err || 'Failed to create poll response'
        logger.serverLog(message, `${TAG}: savepoll`, req.body, {user: req.user}, 'error')
      })
  }
}
