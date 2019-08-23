const logger = require('../../../components/logger')
const TAG = 'api/messengerEvents/welcomeMessage.controller.js'
const {callApi} = require('../utility')
const broadcastUtility = require('../broadcasts/broadcasts.utility')
const messengerEventsUtility = require('./utility')
const needle = require('needle')
let { sendOpAlert } = require('./../../global/operationalAlert')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  const sender = req.body.payload.entry[0].messaging[0].sender.id
  const pageId = req.body.payload.entry[0].messaging[0].recipient.id
  callApi(`pages/query`, 'post', { pageId: pageId, connected: true })
    .then(page => {
      page = page[0]
      callApi(`subscribers/query`, 'post', { pageId: page._id, senderId: sender, companyId: page.companyId })
        .then(subscriber => {
          subscriber = subscriber[0]
          callApi(`jsonAd/jsonAdResponse/${req.body.jsonMessageId}`, 'get', {})
            .then(response => {
              callApi(`jsonAd/${response.jsonAdId}`, 'get', {})
                .then(jsonAd => {
                  if (subscriber) {
                    broadcastUtility.getBatchData(response.messageContent, subscriber.senderId, page, messengerEventsUtility.sendBroadcast, subscriber.firstName, subscriber.lastName, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
                  } else {
                    needle.get(
                      `https://graph.facebook.com/v2.10/${page.pageId}?fields=access_token&access_token=${page.accessToken}`,
                      (err, resp2) => {
                        if (err) {
                          logger.serverLog(TAG, `ERROR ${JSON.stringify(err)}`, 'error')
                        }
                        if (resp2.body.error) {
                          sendOpAlert(resp2.body.error, 'messenger Ads in KiboEngage')
                        }
                        let pageAccessToken = resp2.body.access_token
                        const options = {
                          url: `https://graph.facebook.com/v2.10/${sender}?fields=gender,first_name,last_name,locale,profile_pic,timezone&access_token=${pageAccessToken}`,
                          qs: { access_token: page.accessToken },
                          method: 'GET'

                        }
                        logger.serverLog(TAG, `options: ${JSON.stringify(options)}`, 'error')
                        needle.get(options.url, options, (error, response) => {
                          if (error) {
                          } else {
                            if (response.body.error) {
                              sendOpAlert(response.body.error, 'messenger Ads in KiboEngage')
                            }
                            broadcastUtility.getBatchData(response.messageContent, sender, page, messengerEventsUtility.sendBroadcast, response.body.first_name, response.body.last_name, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
                          }
                        })
                      })
                  }
                })
                .catch(err => {
                  logger.serverLog(TAG, `Failed to fetch json ad ${err}`, 'error')
                })
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to fetch jsonAd ${err}`, 'error')
            })
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch subscriber ${err}`, 'error')
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`, 'error')
    })
}
