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

   // List of user roles, NOTE: don't change the order
  userRoles: ['buyer', 'admin', 'supervisor', 'agent'],

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
    consumer_key: process.env.TWITTER_CONSUMER_KEY || '593k5gKrh5iJZ9Yfj7DwMhD6P',
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET || 'FiAaaa3z6ZPSQd1A954UaErHYkk0h51LoYNJpYCd9JQH5UEPjG',
    consumer_token: process.env.TWITTER_TOKEN || '1059331127113080832-7BRFuE18tyLXmdUZORbW2z3Xu1SC6S',
    consumer_token_secret: process.env.TWITTER_TOKEN_SECRET || 'HvdJuX3jZ4bWIURLJvNNETvY8AVvmSwtFE8hn6251XUp3',
    callbackUrl: 'https://swebhooks.cloudkibo.com/api/twitter'
  },
  webhook_ip: process.env.WEBHOOK_IP_ADDRESS || 'localhost',

  API_URL: process.env.NODE_ENV === 'production' ? 'https://app.kibopush.com/api' : process.env.NODE_ENV === 'staging' ? 'https://staging.kibopush.com/api' : 'http://localhost:3000/api',

  ACCOUNTS_URL: process.env.NODE_ENV === 'production' ? 'https://accounts.cloudkibo.com/api/v1' : process.env.NODE_ENV === 'staging' ? 'https://saccounts.cloudkibo.com/api/v1' : 'http://localhost:3001/api/v1',

  CHAT_URL: process.env.NODE_ENV === 'production' ? 'https://kibochat.cloudkibo.com/api' : process.env.NODE_ENV === 'staging' ? 'https://skibochat.cloudkibo.com/api' : 'http://localhost:3000/api',

  WEBHOOKS_URL: process.env.NODE_ENV === 'production' ? 'https://webhook.cloudkibo.com/api' : process.env.NODE_ENV === 'staging' ? 'https://swebhook.cloudkibo.com/api' : 'http://localhost:3002/api',
  DBLAYER_URL_KIBOCHAT: process.env.NODE_ENV === 'production' ? 'https://dblayer-kibochat.cloudkibo.com/api/v1/' : process.env.NODE_ENV === 'staging' ? 'https://dblayer-skibochat.cloudkibo.com/api/v1/' : 'http://localhost:3000/api/v1/',
  DBLAYER_URL_KIBOENGAGE: process.env.NODE_ENV === 'production' ? 'https://dblayer-kiboengage.cloudkibo.com/api/v1/' : process.env.NODE_ENV === 'staging' ? 'https://dblayer-skiboengage.cloudkibo.com/api/v1/' : 'http://localhost:3000/api/v1/',
}

module.exports = _.merge(
  all,
  require(`./${process.env.NODE_ENV}.js`) || {})
