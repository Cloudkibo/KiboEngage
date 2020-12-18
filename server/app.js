process.env.NODE_ENV = process.env.NODE_ENV || 'development' // production

const express = require('express')
const config = require('./config/environment/index')

const cron = require('node-cron')
const Sentry = require('@sentry/node')

const SequenceScript = require('../scripts/sequenceMessageQueueScript.js')
const TweetsQueueScript = require('../scripts/tweets_queue_script.js')
const abandonedCartScript = require('../scripts/abandonedScript')
const rssFeedsScript = require('../scripts/rssFeedsScript')
const manualFeedsScript = require('../scripts/manualFeedsScript')
const sponsoredScheduled = require('../scripts/scheduleSponsored.js')
const whatsAppMessageStatus = require('../scripts/whatsAppMessageStatus.js')
const whatsAppMonthlyEmail = require('../scripts/whatsAppMonthlyEmail.js')

const app = express()
const httpApp = express()

const appObj = (config.env === 'production' || config.env === 'staging') ? app : httpApp

if (config.env === 'production' || config.env === 'staging') {
  Sentry.init({
    dsn: 'https://6c7958e0570f455381d6f17122fbd117@o132281.ingest.sentry.io/292307',
    release: `KiboEngage-${config.env}@1.0.0`,
    environment: config.env,
    serverName: 'KiboEngage',
    sendDefaultPii: true
  })
}

// cron.schedule('*/5 * * * * *', SequenceScript.runSequenceMessageQueueScript) // after every five seconds
// cron.schedule('0 0 * * * *', TweetsQueueScript.deleteFromQueue) // daily at midnight
// cron.schedule('* * * * *', abandonedCartScript.runScript)
// // cron.schedule('0 8 * * *', rssFeedsScript.runRSSScript) //  everyday at 8 AM
// cron.schedule('0 13 * * *', rssFeedsScript.runRSSScript) //  daily 6 pm pakistan time
// cron.schedule('0 */2 * * *', manualFeedsScript.runScript)
// cron.schedule('* * * * *', sponsoredScheduled.runScheduleSponsored)
// cron.schedule('*/30 * * * * *', whatsAppMessageStatus.runScript)
// cron.schedule('0 0 1 * *', whatsAppMonthlyEmail.runScript) // 1st day of every month

require('./config/express')(appObj)
require('./config/setup')(app, httpApp, config)
require('./routes')(appObj)
require('./api/global/messageStatistics').connectRedis()
// require('./api/scripts/cpuProfiler')()
