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
  port: process.env.PORT || 8000,

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

  API_URL: process.env.NODE_ENV === 'production' ? 'https://app.kibopush.com/api' : process.env.NODE_ENV === 'staging' ? 'https://staging.kibopush.com/api' : 'http://localhost:3000/api',

  ACCOUNTS_URL: process.env.NODE_ENV === 'production' ? 'https://accounts.cloudkibo.com/api/v1' : process.env.NODE_ENV === 'staging' ? 'https://saccounts.cloudkibo.com/api/v1' : 'http://localhost:3000/api/v1',

  CHAT_URL: process.env.NODE_ENV === 'production' ? 'https://kibochat.cloudkibo.com/api/v1' : process.env.NODE_ENV === 'staging' ? 'https://kibochat.cloudkibo.com/api/v1' : 'http://localhost:3000/api/v1'
}

module.exports = _.merge(
  all,
  require(`./${process.env.NODE_ENV}.js`) || {})
