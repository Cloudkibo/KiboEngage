let mongoose = require('mongoose')
const logger = require('../server/components/logger')
const config = require('../server/config/environment')
const TAG = 'scripts/cron_main_script.js'
const CronShcedulerQueue = require('../server/api/cron_scheduler/cron_scheduler.model')

const request = require('request')

mongoose = mongoose.connect(config.mongo.uri)

CronShcedulerQueue.find({}, (err, schedulers) => {
  if (err) {
    logger.serverLog(TAG, `INTERNAL SERVER ERROR ${JSON.stringify(err)}`)
  }

  if (schedulers) {
    // We will write logic here to call the scripts
  } else {
    logger.serverLog(TAG, `Schedulers are not found`)
  }
})
