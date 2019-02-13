const logger = require('../../../components/logger')
const TAG = 'api/messengerEvents/welcomeMessage.controller.js'
const {callApi} = require('../utility')
const broadcastUtility = require('../broadcasts/broadcasts.utility')
const messengerEventsUtility = require('./utility')
const needle = require('needle')

exports.index = function (req, res) {
  console.log('in welcome message controller')
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  const sender = req.body.entry[0].messaging[0].sender.id
  const pageId = req.body.entry[0].messaging[0].recipient.id
  callApi(`pages/query`, 'post', { pageId: pageId, connected: true })
    .then(page => {
      page = page[0]
      console.log('page fetched in welcomeMessage', page)
      callApi(`subscribers/query`, 'post', { pageId: page._id, senderId: sender })
        .then(subscriber => {
          subscriber = subscriber[0]
          if (subscriber) {
            console.log('subscriber fetched in welcomeMessage', subscriber)
            broadcastUtility.getBatchData(page.welcomeMessage, subscriber.senderId, page, messengerEventsUtility.sendBroadcast, subscriber.firstName, subscriber.lastName, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
          } else {
            console.log('going to newSubscriberWebhook')
            needle.get(
              `https://graph.facebook.com/v2.10/${page.pageId}?fields=access_token&access_token=${page.accessToken}`,
              (err, resp2) => {
                if (err) {
                  logger.serverLog(TAG, `ERROR ${JSON.stringify(err)}`)
                }
                console.log('pageAccessToken', resp2.body)
                logger.serverLog(TAG, `page access token: ${JSON.stringify(resp2.body)}`)
                let pageAccessToken = resp2.body.access_token
                const options = {
                  url: `https://graph.facebook.com/v2.10/${sender}?fields=gender,first_name,last_name,locale,profile_pic,timezone&access_token=${pageAccessToken}`,
                  qs: { access_token: page.accessToken },
                  method: 'GET'

                }
                logger.serverLog(TAG, `options: ${JSON.stringify(options)}`)
                needle.get(options.url, options, (error, response) => {
                  if (error) {
                    console.log('error', error)
                  } else {
                    console.log('subscriberInfo')
                    broadcastUtility.getBatchData(page.welcomeMessage, sender, page, messengerEventsUtility.sendBroadcast, response.body.first_name, response.body.last_name, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
                  }
                })
              })
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
