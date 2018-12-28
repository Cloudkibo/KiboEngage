const config = require('../config/environment/index')

const winston = require('winston')

// eslint-disable-next-line no-unused-expressions
require('winston-papertrail').Papertrail

const winstonConfig = {
  levels: {
    error: 0,
    debug: 1,
    warn: 2,
    data: 3,
    info: 4,
    verbose: 5,
    silly: 6
  },
  colors: {
    error: 'red',
    debug: 'blue',
    warn: 'yellow',
    data: 'grey',
    info: 'green',
    verbose: 'cyan',
    silly: 'magenta'
  }
}

const logger = new winston.Logger({
  transports: [
    // new (winston.transports.Console)(),
    new winston.transports.Papertrail({
      host: 'logs3.papertrailapp.com',
      port: 45576,
      colorize: true
    })
  ],
  levels: winstonConfig.levels,
  colors: winstonConfig.colors
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
