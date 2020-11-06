
/*
 * Created by sojharo on 20/07/2017.
 */

const config = require('../config/environment/index')
const sentry = require('../api/global/sentry')
const papertrail = require('../api/global/papertrail')

// data must be req.body
// message must be the title of log/alert
exports.serverLog = function (message, path, data, otherInfo, level = 'info') {
  const namespace = `KiboEngage:${path}`
  const debug = require('debug')(namespace)

  if (config.env === 'development' || config.env === 'test') {
    debug(data)
    console.log(`${namespace} - ${data}`)
  } else {
    papertrail.sendLog(message, path, data, otherInfo, level)
    if (level === 'error') {
      sentry.sendAlert(message, path, data, otherInfo, level)
    }
  }
}

exports.clientLog = function (label, data) {
  const namespace = `KiboEngage:client:${label}`
  const debug = require('debug')(namespace)

  if (config.env === 'development' || config.env === 'staging') {
    debug(data)
  }
}
