const logger = require('./logger')
const TAG = 'components/utility.js'
const config = require('./../config/environment')
const utility = require('../api/v1.1/utility')

function validateUrl (str) {
  let regexp = /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/
  if (regexp.test(str)) {
    return true
  } else {
    return false
  }
}

function setProtocolUrl (str) {
  let prefix = str.substring(0, 4)
  if (prefix === 'http') {
    return str
  } else {
    return 'http://' + str
  }
}

function checkLastMessageAge (subscriberId, req, callback) {
  utility.callApi(`subscribers/query`, 'post', { senderId: subscriberId })
    .then(subscribers => {
      var subscriber = subscribers[0]
      if (subscriber && subscriber.agent_activity_time) {
        let lastActivity = new Date(subscriber.agent_activity_time)
        let inMiliSeconds = Date.now() - lastActivity
        let inMinutes = Math.floor((inMiliSeconds / 1000) / 60)
        callback(null, (inMinutes > 30))
      } else if (subscriber) {
        callback(null, true)
      }
    })
    .catch(error => {
      const message = error || 'failed to fetch subscriber'
      logger.serverLog(message, `${TAG}: checkLastMessageAge`, {subscriberId}, {}, 'error')
      return callback(error)
    })
}

function getSendGridObject () {
  let sendgrid = require('sendgrid')(config.SENDGRID_API_KEY)

  return sendgrid
}

function padWithZeros (n, width, z) {
  z = z || '0'
  n = n + ''
  let result = n.length >= width ? n : new Array(width - n.length + 1).join(z) + n
  return result
}

function dateDiffInDays (date1, date2) {
  const diffTime = Math.abs(date2 - date1)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

exports.validateUrl = validateUrl
exports.checkLastMessageAge = checkLastMessageAge
exports.setProtocolUrl = setProtocolUrl
exports.getSendGridObject = getSendGridObject
exports.padWithZeros = padWithZeros
exports.dateDiffInDays = dateDiffInDays
