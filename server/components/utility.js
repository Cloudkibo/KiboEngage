const logger = require('./logger')
const TAG = 'components/utility.js'
const config = require('./../config/environment')
const axios = require('axios')
const utility = require('../api/v1.1/utility')
logger.serverLog(TAG, 'Server UtilityJS Called: ', 'error')

function validateUrl (str) {
  let regexp = /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/
  if (regexp.test(str)) {
    return true
  } else {
    return false
  }
}

function checkLastMessageAge (subscriberId, req, callback) {
  console.log('subscriberId', subscriberId)
  utility.callApi(`subscribers/query`, 'post', { senderId: subscriberId }, req.headers.authorization)
    .then(subscribers => {
      var subscriber = subscribers[0]
      console.log('subscriber in checkLastMessageAge', subscriber)
      utility.callApi(`sessions/query`, 'post', {subscriber_id: subscriber._id}, req.headers.authorization, 'chat')
        .then(sessions => {
          var session = sessions[0]
          console.log('sesions in checkLastMessageAge', sessions)
          if (session && session.agent_activity_time) {
            let lastActivity = new Date(session.agent_activity_time)
            let inMiliSeconds = Date.now() - lastActivity
            let inMinutes = Math.floor((inMiliSeconds / 1000) / 60)
            callback(null, (inMinutes > 30))
          } else if (subscriber) {
            callback(null, true)
          }
        })
        .catch(error => {
          logger.serverLog(TAG, `failed to fetch session ${JSON.stringify(error)}`)
          return callback(error)
        })
    })
    .catch(error => {
      logger.serverLog(TAG, `failed to fetch subscriber ${JSON.stringify(error)}`)
      return callback(error)
    })
}

exports.validateUrl = validateUrl
exports.checkLastMessageAge = checkLastMessageAge
