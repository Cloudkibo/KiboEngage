const { callApi } = require('../v1.1/utility')
const logger = require('../../components/logger')
const TAG = 'api/global/messageStatistics.js'

exports.record = function (featureName) {
  findRecord(featureName, (err, record) => {
    if (err) {
      return logger.serverLog(TAG, `error in message statistics ${JSON.stringify(err)}`)
    }
    if (!record) {
      createNewRecord(featureName)
    } else {
      incrementRecord(featureName)
    }
  })
}

function createNewRecord (featureName) {
  let today = new Date()
  let payload = { featureName }
  payload.day = today.getDate()
  payload.month = (today.getMonth() + 1)
  payload.year = today.getFullYear()
  payload.messageCount = 1
  callApi('messageStatistics', 'post', payload, 'kiboengage', '')
    .then(saved => {
      logger.serverLog(TAG, 'Message Statistics created successfully!')
    })
    .catch(err => logger.serverLog(TAG, `error in message statistics create ${JSON.stringify(err)}`))
}

function incrementRecord (featureName) {
  let today = new Date()
  let payload = { featureName }
  payload.day = today.getDate()
  payload.month = (today.getMonth() + 1)
  payload.year = today.getFullYear()
  let query = {
    purpose: 'updateOne',
    match: payload,
    updated: { $inc: { messageCount: 1 } }
  }
  callApi(`messageStatistics`, 'put', query, 'kiboengage')
    .then(updated => {
      logger.serverLog(TAG, 'Message Statistics updated successfully!')
    })
    .catch(err => logger.serverLog(TAG, `error in message statistics create ${JSON.stringify(err)}`))
}

function findRecord (featureName, cb) {
  let today = new Date()
  let payload = { featureName }
  payload.day = today.getDate()
  payload.month = (today.getMonth() + 1)
  payload.year = today.getFullYear()
  let query = {
    purpose: 'findOne',
    match: payload
  }
  callApi(`messageStatistics/query`, 'post', query, 'kiboengage')
    .then(found => {
      cb(null, found)
      logger.serverLog(TAG, 'Message Statistics fetched successfully!')
    })
    .catch(err => cb(err))
}
