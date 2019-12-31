const {callApi} = require('../utility')
const broadcastDataLayer = require('../broadcasts/broadcasts.datalayer')
const TAG = 'api/messengerEvents/userInput.controller.js'
const logger = require('../../../components/logger')
const {_prepareBatchData, _callBatchAPI} = require('../../global/sendConversation')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  console.log('userInput.controller', req.body)
  callApi(`subscribers/query`, 'post', {pageId: req.body.pageId, senderId: req.body.senderId, companyId: req.body.companyId})
    .then(subscriber => {
      subscriber = subscriber[0]
      let waitingForUserInput = subscriber.waitingForUserInput
      console.log('subscriber.waitingForUserInput.broadcastId', subscriber.waitingForUserInput.broadcastId)
      broadcastDataLayer.findBroadcast({_id: waitingForUserInput.broadcastId, companyId: req.body.companyId})
        .then(broadcast => {
          console.log('find broadcast', broadcast)
          let payload = broadcast.payload
          if (waitingForUserInput.componentIndex < payload.length - 1) {
            let batch = _prepareBatchData(broadcast, payload.slice(waitingForUserInput.componentIndex + 1, payload.length), [req.body.senderId], req.body.pageId, '', waitingForUserInput)
            _callBatchAPI(JSON.stringify(batch), req.body.pageAccessToken)
              .then(response => {
                logger.serverLog(TAG, `batch_api response ${JSON.stringify(response)}`)
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to send using batch api ${err}`, 'error')
              })
          }
          else {
            waitingForUserInput.componentIndex = -1
            callApi(`subscribers/update`, 'put', {query: {_id: subscriber._id}, newPayload: {waitingForUserInput: waitingForUserInput}, options: {}})
              .then(updated => {
                logger.serverLog(TAG, `Succesfully updated subscriber`)
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to update subscriber ${JSON.stringify(err)}`)
              })
          }
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch broadcast ${err}`, 'error')
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch subscriber ${err}`, 'error')
    })
}