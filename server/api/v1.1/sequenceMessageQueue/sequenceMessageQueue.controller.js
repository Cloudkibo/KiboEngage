const logger = require('../../../components/logger')
const SequenceMessageQueue = require('./sequenceMessageQueue.datalayer')

const TAG = 'api/SequenceMessageQueue/SequenceMessageQueue.controller.js'

exports.index = function (req, res) {
  SequenceMessageQueue.genericFind({ subscriberId: req.body.subscriberId })
    .then(sequenceQueue => {
      if (!sequenceQueue) {
        return res.status(404).json({
          status: 'failed',
          description: 'Automation Queue is empty for this company. Please contact support'
        })
      }
      res.status(200).json({
        status: 'success',
        payload: sequenceQueue
      })
    })
    .catch(err => {
      logger.serverLog(TAG, JSON.stringify(err), 'error')
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    })
}
