const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/seen.controller'
const SequenceUtility = require('../sequenceMessaging/utility')
const SequencesDataLayer = require('../sequenceMessaging/sequence.datalayer')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  logger.serverLog(TAG, `in sequence ${JSON.stringify(req.body)}`)
}
