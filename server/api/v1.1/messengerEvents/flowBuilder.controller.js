const {callApi} = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/flowBuilder.controller.js'
const BroadcastPageDataLayer = require('../page_broadcast/page_broadcast.datalayer')
const { sendUsingBatchAPI } = require('../../global/sendConversation')
exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  const sender = req.body.entry[0].messaging[0].sender.id
  const pageId = req.body.entry[0].messaging[0].recipient.id
  let parsedPayload
  if (req.body.entry[0].messaging[0].message && req.body.entry[0].messaging[0].message.quick_reply) {
    parsedPayload = JSON.parse(req.body.entry[0].messaging[0].message.quick_reply.payload)
  } else {
    parsedPayload = JSON.parse(req.body.entry[0].messaging[0].postback.payload)
  }
  const blockUniqueId = parsedPayload.blockUniqueId
  let reportObj = {
    successful: 0,
    unsuccessful: 0,
    errors: []
  }
  callApi(`pages/query`, 'post', { pageId: pageId, connected: true })
    .then(page => {
      page = page[0]
      let subsFindCriteria = [
        {$match:
          { pageId: page._id, companyId: page.companyId, senderId: sender, completeInfo: true }
        }
      ]
      callApi(`messageBlocks/query`, 'post', { purpose: 'findOne', match: { uniqueId: '' + blockUniqueId } }, 'kiboengage')
        .then(messageBlock => {
          if (messageBlock.module.type === 'broadcast') {
            let pageBroadcastData = {
              pageId: page.pageId,
              userId: page.userId._id,
              broadcastId: messageBlock.module.id,
              seen: false,
              sent: false,
              companyId: page.companyId
            }
            messageBlock = messageBlock.payload
            sendUsingBatchAPI('broadcast', messageBlock, {criteria: subsFindCriteria}, page, '', reportObj, _savePageBroadcast, pageBroadcastData)
          }
        })
        .catch(err => {
          const message = err || 'Failed to fetch messageBlock in query'
          logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
        })
    })
    .catch(err => {
      const message = err || 'Failed to fetch page'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
    })
}
const _savePageBroadcast = (data) => {
  BroadcastPageDataLayer.createForBroadcastPage(data)
    .then(savedpagebroadcast => {
      require('../../global/messageStatistics').record('broadcast')
    })
    .catch(error => {
      const message = error || 'Failed to create page_broadcast'
      logger.serverLog(message, `${TAG}: _savePageBroadcast`, data, {}, 'error')
    })
}
