const path = require('path')
const _ = require('lodash')

const all = {
  env: process.env.NODE_ENV,

  secrets: {
    session: process.env.SESSION_SECRET || 'some string'
  },

  // Project root path
  root: path.normalize(`${__dirname}/../../..`),

  ip: process.env.IP || undefined,

  // List of user roles, NOTE: don't change the order
  userRoles: ['buyer', 'admin', 'supervisor', 'agent'],
  kiboAPIIP: ['::ffff:142.93.66.26', '::ffff:127.0.0.1'],

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
  shopify: {
    app_key: '10128033d2dc6948f383edf548c2aa87',
    app_host: 'https://skiboengage.cloudkibo.com',
    app_secret: 'f41a001b86c700915c9cedc52b955d35'
  },
  sendgrid: {
    username: 'cloudkibo',
    password: 'cl0udk1b0'
  },
  kibodashdomain: `${process.env.KIBODASH || 'http://localhost:5050'}`
}

module.exports = _.merge(
  all,
  require(`./${process.env.NODE_ENV}.js`) || {})
