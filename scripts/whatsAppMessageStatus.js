const logger = require('../server/components/logger')
const utility = require('../server/api/v1.1/utility')
const TAG = 'scripts/whatsAppMessageStatus.js'
const {updateCount} = require('../server/api/v1.1/flockSendEvents/controller')

exports.runScript = function () {
  let query = {
    purpose: 'findAll',
    match: {platform: 'whatsApp'}
  }
  utility.callApi('queue/query', 'post', query, 'kiboengage')
    .then(queues => {
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

function deleteFromQueue (queue) {
  utility.callApi(
    'queue',
    'delete',
    {purpose: 'deleteOne', match: {_id: queue._id}},
    'kiboengage')
    .then(deleted => {
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to delete tweet from tweets queue ${err}`, 'error')
    })
}
