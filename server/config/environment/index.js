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
  ignoreSMP: ['103839534565995'],

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
  google: {
    client_id: process.env.GOOGLE_CLIENT_ID || '690982626012-5o9bk3t3bllluqqnhhcv3k2er3csau9d.apps.googleusercontent.com',
    client_secret: process.env.GOOGLE_SECRET_ID || 'rNU7h2P22JVSo7n7HpMuUk1B',
    callbackURL: `${process.env.DOMAIN || 'https://kibopush-faizan.ngrok.io'}/api/sheetsIntegrations/callback`,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets.readonly'
    ]
  },
  sendgrid: {
    username: process.env.SENDGRID_USERNAME,
    password: process.env.SENDGRID_PASSWORD
  },
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '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',
  nodemailer: {
    service: 'gmail',
    email: 'muzamil@cloudkibo.com',
    password: 'cloudkibo123'
  },
  kibodashdomain: `${process.env.KIBODASH || 'http://localhost:5050'}`,
  twilio: {
    sid: 'ACdeb74ff803b2e44e127d0570e6248b3b',
    token: '5c13521c7655811076a9c04d88fac395',
    number: '+14254286230'
  },
  sms: {
    username: process.env.BANDWIDTH_USERNAME,
    password: process.env.BANDWIDTH_PASSWORD,
    appId: process.env.BANDWIDTH_APPID,
    accountId: process.env.BANDWIDTH_ACCOUNTID
  }
}

module.exports = _.merge(
  all,
  require(`./${process.env.NODE_ENV}.js`) || {})
