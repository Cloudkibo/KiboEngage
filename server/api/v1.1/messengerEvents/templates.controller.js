const logger = require('../../../components/logger')
const TAG = 'api/messengerEvents/templates.controller.js'
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
  let resp = JSON.parse(req.body.entry[0].messaging[0].message.quick_reply.payload)
  const sender = req.body.entry[0].messaging[0].sender.id
  const pageId = req.body.entry[0].messaging[0].recipient.id
  let payloadToSend
  let aggregateData = [
    {$match: { pageId: pageId, connected: true }},
    {$lookup: {from: 'users', foreignField: '_id', localField: 'userId', as: 'userId'}},
    {$unwind: '$userId'}
  ]
  let query = {
    purpose: 'findOne',
    match: {_id: resp.templateId}
  }
  callApi(`templates/broadcast/query`, 'post', query, 'kiboengage')
    .then(template => {
      logger.serverLog(TAG, `retrieved template ${JSON.stringify(template)}`, 'debug')
      callApi(`pages/aggregate`, 'post', aggregateData)
        .then(page => {
          page = page[0]
          callApi(`subscribers/query`, 'post', { pageId: page._id, senderId: sender, companyId: page.companyId, completeInfo: true })
            .then(subscriber => {
              subscriber = subscriber[0]
              logger.serverLog(TAG, `Subscriber ${JSON.stringify(subscriber)}`, 'debug')
              if (template.payload.length > 0 && template.payload[0].fileurl && template.payload[0].fileurl.url) {
                let dataToSend = {
                  pages: [page._id],
                  url: template.payload[0].fileurl.url,
                  componentType: (template.payload[0].componentType === 'media') ? template.payload[0].image_url ? 'image' : 'video' : template.payload[0].componentType,
                  id: template.payload[0].fileurl.id,
                  name: template.payload[0].fileurl.name
                }
                logger.serverLog(TAG, `uploading template ${JSON.stringify(dataToSend)}`, 'debug')
                callApi('uploadTemplate', 'post', dataToSend, 'accounts')
                  .then(uploadedResponse => {
                    logger.serverLog(TAG, `retrieved facebook attachment id ${JSON.stringify(uploadedResponse.payload)}`, 'debug')
                    template.payload.fileurl = uploadedResponse.payload
                    let payloadToSend = template.payload
                    logger.serverLog(TAG, `sending template payload ${JSON.stringify(payloadToSend)}`, 'debug')
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
                            passwordChangeEmailAlert(page.userId._id, page.userId.email)
                          } else if (resp2.body.error) {
                            sendOpAlert(JSON.stringify(resp2.body.error), 'welcome message controller in kiboengage', page._id, page.userId, page.companyId)
                          }
                          logger.serverLog(TAG, `page access token: ${JSON.stringify(resp2.body)}`, 'error')
                          let pageAccessToken = resp2.body.access_token
                          if (pageAccessToken) {
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
                                  sendOpAlert(JSON.stringify(response.body.error), 'welcome message controller in kiboengage', page._id, page.userId, page.companyId)
                                }
                                broadcastUtility.getBatchData(payloadToSend, sender, page, messengerEventsUtility.sendBroadcast, response.body.first_name, response.body.last_name, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
                              }
                            })
                          } else {
                            logger.serverLog(TAG, `Page Access Token invalid for ${page.pageId}`, 'error')
                          }
                        })
                    }
                  })
                  .catch(err => {
                    logger.serverLog(TAG, `Failed to upload template ${err}`, 'error')
                  })
              } else {
                let payloadToSend = template.payload
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
                        passwordChangeEmailAlert(page.userId._id, page.userId.email)
                      } else if (resp2.body.error) {
                        sendOpAlert(JSON.stringify(resp2.body.error), 'welcome message controller in kiboengage', page._id, page.userId, page.companyId)
                      }
                      logger.serverLog(TAG, `page access token: ${JSON.stringify(resp2.body)}`, 'error')
                      let pageAccessToken = resp2.body.access_token
                      if (pageAccessToken) {
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
                              sendOpAlert(JSON.stringify(response.body.error), 'welcome message controller in kiboengage', page._id, page.userId, page.companyId)
                            }
                            broadcastUtility.getBatchData(payloadToSend, sender, page, messengerEventsUtility.sendBroadcast, response.body.first_name, response.body.last_name, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
                          }
                        })
                      } else {
                        logger.serverLog(TAG, `Page Access Token invalid for ${page.pageId}`, 'error')
                      }
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
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch template ${JSON.stringify(err)}`, 'error')
    })
}
