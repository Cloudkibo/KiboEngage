const logger = require('../../../components/logger')
const TAG = 'api/messengerEvents/welcomeMessage.controller.js'
const {callApi} = require('../utility')
const broadcastUtility = require('../broadcasts/broadcasts.utility')
const messengerEventsUtility = require('./utility')
let { getPlainEmailObject } = require('../../global/utility')
let { getSendGridObject } = require('../../../components/utility')
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
      logger.serverLog(TAG, `pageId ${JSON.stringify(page._id)}`, 'debug')
      logger.serverLog(TAG, `companyId ${JSON.stringify(page.companyId)}`, 'debug')
      logger.serverLog(TAG, `senderId ${JSON.stringify(sender)}`, 'debug')
      callApi(`subscribers/query`, 'post', { pageId: page._id, senderId: sender, companyId: page.companyId })
        .then(subscriber => {
          subscriber = subscriber[0]
          logger.serverLog(TAG, `Subscriber ${JSON.stringify(subscriber)}`, 'debug')
          if (page.isWelcomeMessageEnabled) {
            payloadToSend = page.welcomeMessage
            if (subscriber) {
              broadcastUtility.getBatchData(payloadToSend, subscriber.senderId, page, messengerEventsUtility.sendBroadcast, subscriber.firstName, subscriber.lastName, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
            } else {
              needle.get(
                `https://graph.facebook.com/v2.10/${page.pageId}?fields=access_token&access_token=${page.userId.facebookInfo.fbToken}`,
                (err, resp2) => {
                  if (err) {
                    logger.serverLog(TAG, `ERROR ${JSON.stringify(err)}`, 'error')
                  }
                  if (resp2.body.error && resp2.body.error.code === 190) {
                    let body = {
                      query:{
                        _id: req.user._id
                      },
                      newPayload:{
                        connectFacebook: false
                      }
                    }
                    callApi(`user/update`, 'post', body)
                    .then(response1 => {
                      //sucess... Email user to reconnect facebook account
                      let emailText = 'This is to inform you that you need to reconnect your Facebook account to KiboPush. On the next login on KiboPush, you will be asked to reconnect your Facebook account. This happens in cases when you change your password or disconnect KiboPush app.'
                      let email = getPlainEmailObject(req.user.email, 'support@cloudkibo.com', 'KiboPush: Facebook Connect', emailText)
                          if (require('../../../config/environment').env === 'production') {
                            getSendGridObject()
                              .send(email, function (err, json) {
                                if (err) {
                                  logger.log(TAG, 'error in sending Alert email ' + err, 'debug')
                                }
                              })
                          }
                    })
                      .catch( error => {
                        logger.serverLog(TAG, `error: ${JSON.stringify(error)}`, 'error')
                      })
                  } else {
                    sendOpAlert(resp2.body.error, 'welcome message controller in kiboengage')
                  }
                  logger.serverLog(TAG, `page access token: ${JSON.stringify(resp2.body)}`, 'error')
                  let pageAccessToken = resp2.body.access_token
                  const options = {
                    url: `https://graph.facebook.com/v2.10/${sender}?fields=gender,first_name,last_name,locale,profile_pic,timezone&access_token=${pageAccessToken}`,
                    qs: { access_token: page.accessToken },
                    method: 'GET'

                  }
                  logger.serverLog(TAG, `options: ${JSON.stringify(options)}`, 'debug')
                  needle.get(options.url, options, (error, response) => {
                    if (error) {
                    } else {
                      if (response.body.error) {
                        sendOpAlert(response.body.error, 'welcome message controller in kiboengage')
                      }
                      broadcastUtility.getBatchData(payloadToSend, sender, page, messengerEventsUtility.sendBroadcast, response.body.first_name, response.body.last_name, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
                    }
                  })
                })
            }
          }
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch subscriber ${err}`, 'error')
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`, 'error')
    })
}
