const {callApi} = require('../utility')
const broadcastDataLayer = require('../broadcasts/broadcasts.datalayer')
const TAG = 'api/messengerEvents/userInput.controller.js'
const logger = require('../../../components/logger')
const {sendUsingBatchAPI} = require('../../global/sendConversation')
const BroadcastPageDataLayer = require('../page_broadcast/page_broadcast.datalayer')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  callApi(`subscribers/query`, 'post', {pageId: req.body.payload.pageId, senderId: req.body.payload.senderId, companyId: req.body.payload.companyId})
    .then(sub => {
      let subscriber = {}
      subscriber.data = sub 
      let waitingForUserInput = subscriber.data[0].waitingForUserInput
      broadcastDataLayer.findBroadcast({_id: waitingForUserInput.broadcastId, companyId: req.body.payload.companyId})
        .then(broadcast => {
          broadcast.broadcastId = broadcast._id
          let payload = broadcast.payload
          if (waitingForUserInput.componentIndex < payload.length - 1) {
            let broadcast_payload = payload[waitingForUserInput.componentIndex]
            callApi(`pages/query`, 'post', {_id: req.body.payload.pageId})
              .then(pages => {
                if (_checkTypeValidation(broadcast_payload, req.body.message)) {
                  console.log('True _checkTypeValidation', payload)
                  payload.splice(0, waitingForUserInput.componentIndex + 1)
                  sendUsingBatchAPI('update_broadcast', payload, subscriber, pages[0], req.user, '', _savePageBroadcast, broadcast)
                } else {
                  if (waitingForUserInput.incorrectTries > 0) {
                    console.log('False _checkTypeValidation')
                    waitingForUserInput.incorrectTries = waitingForUserInput.incorrectTries - 1
                    _subscriber_update(subscriber, waitingForUserInput)
                    let validationMessage = _createValidationMessage(broadcast_payload.retryMessage)
                    sendUsingBatchAPI('broadcast', validationMessage, subscriber, pages[0], req.user, '', _savePageBroadcast, broadcast)
                  }
                  else {
                    waitingForUserInput.componentIndex = -1
                    _subscriber_update(subscriber, waitingForUserInput)
                  }
                }
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`)
              })
          }
          else {
            console.log('called function component index')
            waitingForUserInput.componentIndex = -1
            _subscriber_update(subscriber, waitingForUserInput)
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

const _checkTypeValidation = (payload, message) => {
  console.log('print message in check type_validation', message)
  if (payload.type === 'text') {
    return message.text
  }
}

const _createValidationMessage = (message) => {
  let data = [{
    text: message,
    componentType: 'text'
  }]
  return data
}

const _subscriber_update = (subscriber, waitingForUserInput) => {

  callApi(`subscribers/update`, 'put', {query: {_id: subscriber.data[0]._id}, newPayload: {waitingForUserInput: waitingForUserInput}, options: {}})
    .then(updated => {
      logger.serverLog(TAG, `Succesfully updated subscriber`)
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to update subscriber ${JSON.stringify(err)}`)
    })
}
