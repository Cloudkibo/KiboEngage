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
  const parsedPayload = JSON.parse(req.body.entry[0].messaging[0].postback.payload)
  const blockUniqueId = parsedPayload.blockUniqueId
  let reportObj = {
    successful: 0,
    unsuccessful: 0,
    errors: []
  }
  console.log('WE CAME HERE')
  callApi(`pages/query`, 'post', { pageId: pageId, connected: true })
    .then(page => {
      page = page[0]
      let subsFindCriteria = { pageId: page._id, companyId: page.companyId, senderId: sender, completeInfo: true }
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
            sendUsingBatchAPI('broadcast', messageBlock, subsFindCriteria, page, '', reportObj, _savePageBroadcast, pageBroadcastData)
          }
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch messageBlock in query ${JSON.stringify(err)}`, 'error')
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`, 'error')
    })
}
const _savePageBroadcast = (data) => {
  BroadcastPageDataLayer.createForBroadcastPage(data)
    .then(savedpagebroadcast => {
      require('../../global/messageStatistics').record('broadcast')
      logger.serverLog(TAG, 'page broadcast object saved in db')
    })
    .catch(error => {
      logger.serverLog(`Failed to create page_broadcast ${JSON.stringify(error)}`)
    })
}
