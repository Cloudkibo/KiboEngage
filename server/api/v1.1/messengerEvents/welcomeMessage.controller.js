const logger = require('../../../components/logger')
const TAG = 'api/messengerEvents/welcomeMessage.controller.js'
const {callApi} = require('../utility')
const broadcastUtility = require('../broadcasts/broadcasts.utility')
let { passwordChangeEmailAlert } = require('../../global/utility')
const messengerEventsUtility = require('./utility')
const needle = require('needle')
let { sendOpAlert } = require('./../../global/operationalAlert')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  const sender = req.body.entry[0].messaging[0].sender.id
  const pageId = req.body.entry[0].messaging[0].recipient.id
  let payloadToSend
  let aggregateData = [
    {$match: { pageId: pageId, connected: true }},
    {$lookup: {from: 'users', foreignField: '_id', localField: 'userId', as: 'userId'}},
    {$unwind: '$userId'}
  ]
  callApi(`pages/aggregate`, 'post', aggregateData)
    .then(page => {
      page = page[0]
      callApi(`subscribers/query`, 'post', { pageId: page._id, senderId: sender, companyId: page.companyId, completeInfo: true })
        .then(subscriber => {
          subscriber = subscriber[0]
          if (page.isWelcomeMessageEnabled) {
            payloadToSend = page.welcomeMessage
            if (subscriber) {
              broadcastUtility.getBatchData(payloadToSend, subscriber.senderId, page, messengerEventsUtility.sendBroadcast, subscriber.firstName, subscriber.lastName, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
            } else {
              needle.get(
                `https://graph.facebook.com/v6.0/${page.pageId}?fields=access_token&access_token=${page.userId.facebookInfo.fbToken}`,
                (err, resp2) => {
                  if (err) {
                    const message = err || 'Internal Server Error'
                    logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
                  }
                  if (resp2.body.error && resp2.body.error.code === 190) {
                    passwordChangeEmailAlert(page.userId._id, page.userId.email)
                  } else if (resp2.body.error) {
                    sendOpAlert(JSON.stringify(resp2.body.error), 'welcome message controller in kiboengage', page._id, page.userId, page.companyId)
                  }
                  let pageAccessToken = resp2.body.access_token
                  if (pageAccessToken) {
                    const options = {
                      url: `https://graph.facebook.com/v6.0/${sender}?fields=gender,first_name,last_name,locale,profile_pic,timezone&access_token=${pageAccessToken}`,
                      qs: { access_token: page.accessToken },
                      method: 'GET'

                    }
                    needle.get(options.url, options, (error, response) => {
                      if (error) {
                      } else {
                        if (response.body.error) {
                          sendOpAlert(JSON.stringify(response.body.error), 'welcome message controller in kiboengage', page._id, page.userId, page.companyId)
                        }
                        broadcastUtility.getBatchData(payloadToSend, sender, page, messengerEventsUtility.sendBroadcast, response.body.first_name, response.body.last_name, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
                      }
                    })
                  }
                })
            }
          }
        })
        .catch(err => {
          const message = err || 'Failed to fetch subscriber'
          logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
        })
    })
    .catch(err => {
      const message = err || 'Failed to fetch page'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
    })
}

exports.emailNumberQuickReply = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let payload = req.body.entry[0].messaging[0].message.quick_reply.payload
  const sender = req.body.entry[0].messaging[0].sender.id
  const pageId = req.body.entry[0].messaging[0].recipient.id
  callApi(`pages/query`, 'post', {pageId: pageId, connected: true})
    .then(page => {
      page = page[0]
      var welcomeMessage = page.welcomeMessage
      if (welcomeMessage.length > 0 && welcomeMessage[welcomeMessage.length - 1].quickReplies) {
        getQuickReplyPayload(welcomeMessage, payload, page)
          .then(quickReplyPayload => {
            performActions(page, sender, quickReplyPayload, payload)
          })
          .catch(err => {
            const message = err || 'Failed to get quickReplyPayload'
            logger.serverLog(message, `${TAG}: exports.emailNumberQuickReply`, req.body, {user: req.user, page},
              message.message && message.message.includes('Message Block not found') ? 'info' : 'error')
          })
      }
    })
    .catch(err => {
      const message = err || 'Failed to fetch page'
      logger.serverLog(message, `${TAG}: exports.emailNumberQuickReply`, req.body, {user: req.user}, 'error')
    })
}

function searchQuickReply (quickReplies, payload) {
  let quickReplyPayload
  if (messengerEventsUtility.validateEmail(payload)) {
    for (let i = 0; i < quickReplies.length; i++) {
      if (quickReplies[i].content_type === 'user_email') {
        quickReplyPayload = quickReplies[i].payload
      }
    }
  } else if (messengerEventsUtility.validatePhoneNumber(payload)) {
    // quickReplyPayload = JSON.stringify([{action: 'set_subscriber_field', fieldName: 'phoneNumber'}])
    for (let i = 0; i < quickReplies.length; i++) {
      if (quickReplies[i].content_type === 'user_phone_number') {
        quickReplyPayload = quickReplies[i].payload
      }
    }
  }
  return quickReplyPayload
}

function getQuickReplyPayload (welcomeMessage, payload, page) {
  return new Promise(function (resolve, reject) {
    let quickReplyPayload = searchQuickReply(welcomeMessage[welcomeMessage.length - 1].quickReplies, payload)
    if (quickReplyPayload) {
      resolve(quickReplyPayload)
    } else {
      callApi(`messageBlocks/query`, 'post', { purpose: 'findOne', match: { 'module.id': page._id, 'module.type': 'welcomeMessage' } }, 'kiboengage')
        .then(messageBlock => {
          if (messageBlock) {
            quickReplyPayload = searchQuickReply(messageBlock.payload[messageBlock.payload.length - 1].quickReplies, payload)
            quickReplyPayload ? resolve(quickReplyPayload) : reject(new Error('Message Block not found'))
          } else {
            reject(new Error('Message Block not found'))
          }
        })
        .catch(err => {
          reject(err)
        })
    }
  })
}

function performActions (page, sender, payload, value) {
  let parsedPayload = JSON.parse(payload)
  if (parsedPayload[0]) {
    for (let i = 0; i < parsedPayload.length; i++) {
      if (parsedPayload[i].action && parsedPayload[i].action === 'set_subscriber_field') {
        updateSubscriber(page, sender, parsedPayload[i], value)
      }
      if (parsedPayload[i].action && parsedPayload[i].action === 'send_message_block') {
        sendReply(page, sender, parsedPayload[i])
      }
    }
  }
}

function updateSubscriber (page, sender, payload, value) {
  let query = {
    pageId: page._id, senderId: sender, companyId: page.companyId, completeInfo: true
  }
  let newPayload = {}
  newPayload[payload.fieldName] = value
  callApi(`subscribers/update`, 'put', {query, newPayload, options: {}})
    .then(updated => {
    })
    .catch(err => {
      const message = err || 'Failed to udpate subscriber'
      logger.serverLog(message, `${TAG}: updateSubscriber`, {sender, payload, page, value}, {}, 'error')
    })
}

function sendReply (page, sender, payload) {
  callApi(`subscribers/query`, 'post', { pageId: page._id, senderId: sender, companyId: page.companyId, completeInfo: true })
    .then(subscriber => {
      subscriber = subscriber[0]
      if (subscriber) {
        callApi(`messageBlocks/query`, 'post', { purpose: 'findOne', match: { uniqueId: '' + payload.blockUniqueId } }, 'kiboengage')
          .then(messageBlock => {
            if (messageBlock && messageBlock.module.type === 'welcomeMessage') {
              broadcastUtility.getBatchData(messageBlock.payload, subscriber.senderId, page, messengerEventsUtility.sendBroadcast, subscriber.firstName, subscriber.lastName, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
            }
          })
          .catch(err => {
            const message = err || 'Failed to send reply'
            logger.serverLog(message, `${TAG}: sendReply`, {sender, payload, page}, {}, 'error')
          })
      }
    })
    .catch(err => {
      const message = err || 'Failed to fetch subscriber'
      logger.serverLog(message, `${TAG}: sendReply`, {sender, payload, page}, {}, 'error')
    })
}
