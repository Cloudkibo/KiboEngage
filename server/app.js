process.env.NODE_ENV = process.env.NODE_ENV || 'development' // production

const express = require('express')
const config = require('./config/environment/index')

const cron = require('node-cron')
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
  const Raven = require('raven')
  Raven.config('https://6c7958e0570f455381d6f17122fbd117:d2041f4406ff4b3cb51290d9b8661a7d@sentry.io/292307', {
    environment: config.env,
    parseUser: ['name', 'email', 'domain', 'role', 'emailVerified']
  }).install()
  appObj.use(Raven.requestHandler())
}

// cron.schedule('*/5 * * * * *', SequenceScript.runSequenceMessageQueueScript) // after every five seconds
// cron.schedule('0 0 * * * *', TweetsQueueScript.deleteFromQueue) // daily at midnight
// cron.schedule('* * * * *', abandonedCartScript.runScript)
// // cron.schedule('0 8 * * *', rssFeedsScript.runRSSScript) //  everyday at 8 AM
// cron.schedule('0 13 * * *', rssFeedsScript.runRSSScript) //  daily 6 pm pakistan time
// cron.schedule('0 */2 * * *', manualFeedsScript.runScript)
// cron.schedule('* * * * *', sponsoredScheduled.runScheduleSponsored)
cron.schedule('*/5 * * * * *', whatsAppMessageStatus.runScript)
// cron.schedule('0 0 1 * *', whatsAppMonthlyEmail.runScript) // 1st day of every month

require('./config/express')(appObj)
require('./config/setup')(app, httpApp, config)
require('./routes')(appObj)
require('./api/global/messageStatistics').connectRedis()
// require('./api/scripts/cpuProfiler')()
