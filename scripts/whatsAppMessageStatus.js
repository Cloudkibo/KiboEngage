const logger = require('../server/components/logger')
const utility = require('../server/api/v1.1/utility')
const TAG = 'scripts/whatsAppMessageStatus.js'
const {updateCount} = require('../server/api/v1.1/flockSendEvents/controller')
const async = require('async')

exports.runScript = function () {
  let query = {
    purpose: 'findAll',
    match: {platform: 'whatsApp'}
  }
  console.log('running script')
  utility.callApi('queue/query', 'post', query, 'kiboengage')
    .then(queues => {
      console.log('queues got', queues[0])
      queues.forEach(queue => {
        utility.callApi('whatsAppBroadcastMessages/query',
          'post', {purpose: 'findOne', match: {messageId: queue.payload.id}},
          'kiboengage')
          .then(message => {
            if (message) {
              updateCount(message, queue.payload)
              deleteFromQueue(queue)
            }
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to fetch whatsAppBroadcastMessage ${err}`, 'error')
          })
      })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch queues ${err}`, 'error')
    })
}

function uniqueValuesCount(arr) {
  return arr.reduce((prev, curr) => (prev[curr] = ++prev[curr] || 1, prev), {})
}

const updateAndDeleteMessages = function (skipRecords, LimitRecords) {
  let query = {
    purpose: 'aggregate',
    match: {},
    skip: skipRecords,
    limit: LimitRecords
  }
  utility.callApi('queue/aggregate', 'post', query, 'kiboengage')
    .then(queues => {
      if (queues.length > 0) {
        let queuesIds = queues.map(queue => queue.payload.id)
        let uniqueQueuesIds = uniqueValuesCount(queuesIds)
        utility.callApi('whatsAppBroadcastMessages/query',
          'post', {purpose: 'findAll', match: {messageId: {$in: Object.keys(uniqueQueuesIds)}}},
          'kiboengage')
          .then(messages => {
           _updateCount(messages, uniqueQueuesIds).then(data => {
            })
        })
        // _updateCount(queues).then(data => {
        //   let queueIds = queues.map(queue => queue.payload.id)
        //   deleteFromQueue(queueIds).then(data => {
        //     updateAndDeleteMessages(skipRecords + LimitRecords, LimitRecords)
        //   }).catch(err => {
        //     logger.serverLog(TAG, `Failed to delete broadcast messages from Queue ${err}`, 'error')
        //   })

        // }).catch(err => {
        //   logger.serverLog(TAG, `Failed to updtae broadcast messages ${err}`, 'error')
        // })
      } // else we don't need to do anything
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch queues ${err}`, 'error')
    })
}

const _updateCount = (queues) => {
  return new Promise(function (resolve, reject) {
    let requests = []
    queues.forEach(queue => {
      requests.push(
        utility.callApi('whatsAppBroadcastMessages/query',
          'post', {purpose: 'findOne', match: {messageId: queue.payload.id}},
          'kiboengage')
          .then(message => {
            if (message) {
              return new Promise((resolve, reject) => {
                async.parallelLimit([
                  _UpdatewhatsAppBroadcastMessages.bind(null, message, queue.payload),
                  _UpdatewhatsAppBroadcasts.bind(null, message, queue.payload)
                ], 10, function (err, results) {
                  if (err) {
                    logger.serverLog(TAG, `Failed to fetch broadcasts ${JSON.stringify(err)}`, 'error')
                  } else {
                  }
                  resolve('success')
                })
              })
              // updateCount(message, queue.payload)
              // deleteFromQueue(queue)
            }
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to fetch whatsAppBroadcastMessage ${err}`, 'error')
          })
      )
    })
    Promise.all(requests)
      .then(results => {
        resolve('success')
      })
  }) 
}
function deleteFromQueue (queueIds) {
  return new Promise(function (resolve, reject) {
    utility.callApi(
      'queue',
      'delete',
      {purpose: 'deleteMany', match: {_id: {$in: queueIds}}},
      'kiboengage')
      .then(deleted => {
        resolve('success')
      })
      .catch(err => {
        resolve('success')
        logger.serverLog(TAG, `Failed to delete tweet from tweets queue ${err}`, 'error')
      })
  })
}

const _UpdatewhatsAppBroadcastMessages = (message, body) => {
  let updateData = {
    purpose: 'updateOne',
    match: {_id: message._id},
    updated: body.status === 'delivered' ? {delivered: true} : {seen: true}
  }
  utility.callApi(`whatsAppBroadcastMessages`, 'put', updateData, 'kiboengage')
    .then(message => {
    })
    .catch((err) => {
      logger.serverLog(`Failed to update message ${err}`, 'error')
    })
}

const _UpdatewhatsAppBroadcasts = (message, body) => {
  let broadcastCountUpdate = {
    purpose: 'updateOne',
    match: {_id: message.broadcastId},
    updated: body.status === 'delivered'
      ? { $inc: { delivered: 1 } } : { $inc: { seen: 1 } }
  }
  utility.callApi(`whatsAppBroadcasts`, 'put', broadcastCountUpdate, 'kiboengage')
    .then(broadcast => {
    })
    .catch((err) => {
      logger.serverLog(`Failed to update broadcast ${err}`, 'error')
    })
}