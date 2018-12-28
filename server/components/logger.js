const config = require('../config/environment/index')

const winston = require('winston')

// eslint-disable-next-line no-unused-expressions
require('winston-papertrail').Papertrail

const logger = new winston.Logger({
  transports: [
    // new (winston.transports.Console)(),
    new winston.transports.Papertrail({
      host: 'logs3.papertrailapp.com',
      port: 45576,
      colorize: true
    })
  ]
})

exports.serverLog = function (label, data, hideFromProduction, type = 'info') {
  const namespace = `KiboEngage:${label}`
  const debug = require('debug')(namespace)

  if (config.env === 'development' || config.env === 'test') {
    debug(data)
    // todo use log levels like info, warn, error and debug
    // logger.info(`${namespace} - ${data}`)
  } else {
    if (!hideFromProduction) {
      if (type === 'error') logger.error(`${namespace} - ${data}`)
      else logger.info(`${namespace} - ${data}`)
    }
  }
}

exports.clientLog = function (label, data) {
  const namespace = `project:client:${label}`
  const debug = require('debug')(namespace)

  if (config.env === 'development' || config.env === 'staging') {
    debug(data)
    // todo use log levels like info, warn, error and debug
    logger.info(`${namespace} - ${data}`)
  } else {
    logger.info(`${namespace} - ${data}`)
  }
}
