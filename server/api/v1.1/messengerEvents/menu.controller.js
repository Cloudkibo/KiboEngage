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
  let replyPayload = JSON.parse(req.body.entry[0].messaging[0].postback.payload)
  const sender = req.body.entry[0].messaging[0].sender.id
  const pageId = req.body.entry[0].messaging[0].recipient.id
  callApi(`pages/query`, 'post', { pageId: pageId, connected: true })
    .then(page => {
      page = page[0]
      callApi(`subscribers/query`, 'post', { pageId: page._id, companyId: page.companyId, senderId: sender, completeInfo: true })
        .then(subscriber => {
          subscriber = subscriber[0]
          if (subscriber) {
            callApi('menu/query', 'post', {pageId: page._id, companyId: page.companyId})
              .then(menu => {
                menu = menu[0]
                if (menu) {
                  if (replyPayload.action && menu.jsonStructure[replyPayload.index]) {
                    broadcastUtility.getBatchData(JSON.parse(menu.jsonStructure[replyPayload.index].payload), subscriber.senderId, page, messengerEventsUtility.sendBroadcast, subscriber.firstName, subscriber.lastName, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
                  } else {
                    broadcastUtility.getBatchData(replyPayload, subscriber.senderId, page, messengerEventsUtility.sendBroadcast, subscriber.firstName, subscriber.lastName, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
                  }
                } else {
                  broadcastUtility.getBatchData(replyPayload, subscriber.senderId, page, messengerEventsUtility.sendBroadcast, subscriber.firstName, subscriber.lastName, '', 0, 1, 'NON_PROMOTIONAL_SUBSCRIPTION')
                }
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to fetch menu ${err}`, 'error')
              })
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
