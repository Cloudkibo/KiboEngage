const {callApi} = require('../utility')
const broadcastDataLayer = require('../broadcasts/broadcasts.datalayer')
const TAG = 'api/messengerEvents/userInput.controller.js'
const logger = require('../../../components/logger')
const {sendUsingBatchAPI} = require('../../global/sendConversation')
const BroadcastPageDataLayer = require('../page_broadcast/page_broadcast.datalayer')
const {isEmailAddress, isWebURL, isNumber, isPhoneNumber} = require('../../global/utility')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  if (req.body.message === 'userInputSkip') {
    const event = req.body.payload.entry[0].messaging[0]
    let message = event.message
    message.quick_reply.payload = JSON.parse(message.quick_reply.payload)
    const senderId = event.message && event.message.is_echo ? event.recipient.id : event.sender.id
    const pageId = event.message && event.message.is_echo ? event.sender.id : event.recipient.id
    callApi(`pages/query`, 'post', { pageId: pageId, connected: true }, 'accounts')
      .then(pages => {
        let page = pages[0]
        let payload = {
          senderId: senderId,
          pageId: page._id,
          isSubscribed: true,
          companyId: page.companyId
        }
        req.body.payload = payload
        req.body.message = message
        _sendNextMessage(req, res)
      }).catch(err => {
        logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`)
      })
  } else {
    _sendNextMessage(req, res)
  }
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
  if (payload.type === 'text') {
    return message.text
  } else if (payload.type === 'email') {
    return isEmailAddress(message.text)
  } else if (payload.type === 'url') {
    return isWebURL(message.text)
  } else if (payload.type === 'number') {
    return isNumber(message.text)
  }
  else if (payload.type === 'phoneNumber') {
    return isPhoneNumber(message.text)
  }
}

const _createValidationMessage = (message, skipButtonText) => {
  let data = [{
    text: message,
    componentType: 'text',
    quickReplies: [
      {
        'content_type': 'text',
        'title': skipButtonText,
        'payload': JSON.stringify(
          {
            option: 'userInputSkip'
          }
        )
      }
    ]
  }]
  return data
}

const _subscriberUpdate = (subscriber, waitingForUserInput) => {
  callApi(`subscribers/update`, 'put', {query: {_id: subscriber.data[0]._id}, newPayload: {waitingForUserInput: waitingForUserInput}, options: {}})
    .then(updated => {
      logger.serverLog(TAG, `Succesfully updated subscriber`)
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to update subscriber ${JSON.stringify(err)}`)
    })
}

const _sendNextMessage = (req, res) => {
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
                if (_checkTypeValidation(broadcast_payload, req.body.message) || req.body.message.quick_reply) {
                  logger.serverLog(TAG, `True _checkTypeValidation ${JSON.stringify(payload)}`)
                  payload.splice(0, waitingForUserInput.componentIndex + 1)
                  sendUsingBatchAPI('update_broadcast', payload, subscriber, pages[0], req.user, '', _savePageBroadcast, broadcast)
                } else {
                  if (waitingForUserInput.incorrectTries > 0) {
                    logger.serverLog(TAG, `False _checkTypeValidation`)
                    waitingForUserInput.incorrectTries = waitingForUserInput.incorrectTries - 1
                    _subscriberUpdate(subscriber, waitingForUserInput)
                    let validationMessage = _createValidationMessage(broadcast_payload.retryMessage, broadcast_payload.skipButtonText)
                    sendUsingBatchAPI('broadcast_message', validationMessage, subscriber, pages[0], req.user, '', _savePageBroadcast, broadcast)
                  }
                  else {
                    waitingForUserInput.componentIndex = -1
                    _subscriberUpdate(subscriber, waitingForUserInput)
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
            _subscriberUpdate(subscriber, waitingForUserInput)
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