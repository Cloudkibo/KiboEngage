process.env.NODE_ENV = process.env.NODE_ENV || 'development' // production

const express = require('express')
const config = require('./config/environment/index')

const cron = require('node-cron')
const SequenceScript = require('../scripts/sequenceMessageQueueScript.js')
const TweetsQueueScript = require('../scripts/tweets_queue_script.js')
const abandonedCartScript = require('../scripts/abandonedScript')
const rssScript = require('../scripts/rssScript')
const rssFeedsScript = require('../scripts/rssFeedsScript')

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
// cron.schedule('0 */1 * * *', rssScript.runRSSScript) // after 1 hour
// cron.schedule('0 8 * * *', rssFeedsScript.runRSSScript) //  everyday at 8 AM
//cron.schedule('0 */2 * * *', rssFeedsScript.runRSSScript) //  after every 2 hours for testing
// cron.schedule('*/15 * * * *', rssFeedsScript.runRSSScript) //run every 15 minutes
// cron.schedule('* * * * *', rssFeedsScript.runRSSScript) //run every 15 minutes

require('./config/express')(appObj)
require('./config/setup')(app, httpApp, config)
require('./routes')(appObj)
// require('./api/global/messageStatistics').connectRedis()
// require('./api/scripts/cpuProfiler')()
