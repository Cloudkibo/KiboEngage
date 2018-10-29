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
  secure_port: process.env.SECURE_PORT || 8444,

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
    consumer_key: process.env.TWITTER_CONSUMER_KEY || 'f83b0cd6ccb20142185616dsf54dsf4',
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET || 'f83b0cd6ccb20142185616dsf54dsf4',
    consumer_token: process.env.TWITTER_TOKEN || 'f83b0cd6ccb20142185616dsf54dsf4',
    consumer_token_secret: process.env.TWITTER_TOKEN_SECRET || 'f83b0cd6ccb20142185616dsf54dsf4',
    callbackUrl: `${process.env.DOMAIN || 'https://staging.kibopush.com'}/api/autoposting/twitter`
  },

  API_URL: process.env.NODE_ENV === 'production' ? 'https://app.kibopush.com/api' : process.env.NODE_ENV === 'staging' ? 'https://staging.kibopush.com/api' : 'http://localhost:3000/api',

  ACCOUNTS_URL: process.env.NODE_ENV === 'production' ? 'https://accounts.cloudkibo.com/api/v1' : process.env.NODE_ENV === 'staging' ? 'https://saccounts.cloudkibo.com/api/v1' : 'http://localhost:3001/api/v1',

  CHAT_URL: process.env.NODE_ENV === 'production' ? 'https://kibochat.cloudkibo.com/api' : process.env.NODE_ENV === 'staging' ? 'https://skibochat.cloudkibo.com/api' : 'http://localhost:3000/api'
}

module.exports = _.merge(
  all,
  require(`./${process.env.NODE_ENV}.js`) || {})
