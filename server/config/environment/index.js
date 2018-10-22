const path = require('path')
const _ = require('lodash')

const all = {
  env: process.env.NODE_ENV,

  secrets: {
    session: process.env.SESSION_SECRET || 'some string'
  },

  // Project root path
  root: path.normalize(`${__dirname}/../../..`),

  // Server port
  port: process.env.PORT || 3000,

  // Secure Server port
  secure_port: process.env.SECURE_PORT || 8443,

  ip: process.env.IP || undefined,

  domain: `${process.env.DOMAIN || 'project domain'}`,

  // Mongo Options
  mongo: {
    options: {
      db: {
        safe: true
      }
    }
  },
  twitter: {
    consumer_key: process.env.TWITTER_CONSUMER_KEY || 'SPyt40d2i8IfIFoYtW5LtYnG8',
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET || 'L00OE6SIGOMjI0ZDe5n3ncnFdaxHaAco6wzkR2jdzLXJnXYoID',
    consumer_token: process.env.TWITTER_TOKEN || '2616186000-dAaH7yuQsBGNcbvnCiHweB8rFm54pF2YOC0hOtP',
    consumer_token_secret: process.env.TWITTER_TOKEN_SECRET || '6hWNxP6qwjPEjEfLwT8uK9JpPVFzwA3BxBeCSU7J6rylT',
    callbackUrl: `${process.env.DOMAIN || 'https://staging.kibopush.com'}/api/autoposting/twitter`
  },
  API_URL: process.env.NODE_ENV === 'production' ? 'https://app.kibopush.com/api' : process.env.NODE_ENV === 'staging' ? 'https://staging.kibopush.com/api' : 'http://localhost:3000/api',

  ACCOUNTS_URL: process.env.NODE_ENV === 'production' ? 'https://accounts.cloudkibo.com/api/v1' : process.env.NODE_ENV === 'staging' ? 'https://saccounts.cloudkibo.com/api/v1' : 'http://localhost:3000/api/v1',

  CHAT_URL: process.env.NODE_ENV === 'production' ? 'https://kibochat.cloudkibo.com/api/v1' : process.env.NODE_ENV === 'staging' ? 'https://kibochat.cloudkibo.com/api/v1' : 'http://localhost:3000/api/v1'
}

module.exports = _.merge(
  all,
  require(`./${process.env.NODE_ENV}.js`) || {})
