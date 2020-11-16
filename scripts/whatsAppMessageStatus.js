const logger = require('../server/components/logger')
const utility = require('../server/api/v1.1/utility')
const TAG = 'scripts/whatsAppMessageStatus.js'
const async = require('async')

exports.runScript = function () {
  updateAndDeleteMessages(0, 25, 'seen')
  updateAndDeleteMessages(0, 25, 'delivered')
}

const updateAndDeleteMessages = function (skipRecords, LimitRecords, status) {
  let query = {
    purpose: 'aggregate',
    match: {platform: 'whatsApp', 'payload.status': status},
    skip: skipRecords,
    limit: LimitRecords
  }
  utility.callApi('queue/query', 'post', query, 'kiboengage')
    .then(queues => {
      if (queues.length > 0) {
        let queuesIds = queues.map(queue => queue.payload.id)
        utility.callApi('whatsAppBroadcastMessages/query',
          'post', {purpose: 'findAll', match: {messageId: {$in: queuesIds}}},
          'kiboengage')
          .then(messages => {
            if (messages.length > 0) {
              _updateCount(messages, status).then(data => {
                updateAndDeleteMessages(skipRecords + LimitRecords, LimitRecords, status)
              })
            }
          })
      } // else we don't need to do anything
    })
    .catch(err => {
      const message = err || 'Failed to fetch queues'
      logger.serverLog(message, `${TAG}: exports.runScript`, {}, {}, 'error')
    })
}

const _updateCount = (messages, status) => {
  return new Promise(function (resolve, reject) {
    let requests = []
    let broadcastIds = []
    messages.forEach(message => {
      let broadcastId = message.broadcastId
      let broadcastCount = messages.filter(messageTemp => messageTemp.broadcastId === broadcastId).length
      if (broadcastIds.includes(broadcastId)) {
        requests.push(
          new Promise((resolve, reject) => {
            async.parallelLimit([
              _UpdatewhatsAppBroadcastMessages.bind(null, message, status),
              deleteFromQueue.bind(null, message.messageId, status)
            ], 10, function (err, results) {
              if (err) {
                logger.serverLog(TAG, `Failed to update broadcasts in whatsapp Message status file ${JSON.stringify(err)}`, 'error')
              } else {
              }
              resolve('success')
            })
          })
        )
      } else {
        broadcastIds.push(broadcastId)
        requests.push(
          new Promise((resolve, reject) => {
            async.parallelLimit([
              _UpdatewhatsAppBroadcastMessages.bind(null, message, status),
              _UpdatewhatsAppBroadcasts.bind(null, message, status, broadcastCount),
              deleteFromQueue.bind(null, message.messageId, status)
            ], 10, function (err, results) {
              if (err) {
                logger.serverLog(TAG, `Failed to fetch broadcasts ${JSON.stringify(err)}`, 'error')
              } else {
              }
              resolve('success')
            })
          })
        )
      }
    })
    Promise.all(requests)
      .then(results => {
        resolve('success')
      })
  })
}
function deleteFromQueue (messageId, status, next) {
  utility.callApi(
    'queue',
    'delete',
    {purpose: 'deleteOne', match: {'payload.id': messageId, 'payload.status': status}},
    'kiboengage')
    .then(deleted => {
      next(null, deleted)
    })
    .catch(err => {
      next(err)
      const message = err || 'Failed to delete whatsapp message from tweets queue'
      logger.serverLog(message, `${TAG}: deleteFromQueue`, {messageId, status}, {}, 'error')
    })
}

const _UpdatewhatsAppBroadcastMessages = (message, status, next) => {
  let updateData = {
    purpose: 'updateOne',
    match: {_id: message._id},
    updated: status === 'delivered' ? {delivered: true} : {seen: true}
  }
  utility.callApi(`whatsAppBroadcastMessages`, 'put', updateData, 'kiboengage')
    .then(message => {
      next(null, message)
    })
    .catch((err) => {
      const message = err || 'Failed to update message'
      logger.serverLog(message, `${TAG}: _UpdatewhatsAppBroadcastMessages`, {message, status}, {}, 'error')
      next(err)
    })
}

const _UpdatewhatsAppBroadcasts = (message, status, incValue, next) => {
  let broadcastCountUpdate = {
    purpose: 'updateOne',
    match: {_id: message.broadcastId},
    updated: status === 'delivered'
      ? { $inc: { delivered: incValue } } : { $inc: { seen: incValue } }
  }
  utility.callApi(`whatsAppBroadcasts`, 'put', broadcastCountUpdate, 'kiboengage')
    .then(broadcast => {
      next(null, broadcast)
    })
    .catch((err) => {
      const message = err || 'Failed to update broadcast'
      logger.serverLog(message, `${TAG}: _UpdatewhatsAppBroadcasts`, {message, status}, {}, 'error')
      next(err)
    })
}
