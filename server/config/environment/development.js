'use strict'

// Development specific configuration
// ==================================
module.exports = {

  // Server port
  port: 3021,

  // Secure Server port
  secure_port: 8441,

  domain: 'http://localhost:3021',

  // MongoDB connection options
  mongo: {
    uri: 'mongodb://localhost/kiboengage-dev'
  },
  seedDB: false,
  facebook: {
    clientID: process.env.FACEBOOK_ID || '159385484629940',
    clientSecret: process.env.FACEBOOK_SECRET || '67527aa04570a034b6ff67335d95e91c',
    callbackURL: `${process.env.DOMAIN || 'https://kibopush-faizan.ngrok.io'}/auth/facebook/callback`
  },

  api_urls: {
    webhook: 'http://localhost:3020/api',
    kibopush: 'http://localhost:3000/api',
    accounts: 'http://localhost:3024/api/v1',
    chat: 'http://localhost:3022/api',
    kibochat: `http://localhost:3030/api/v1`,
    kiboengage: `http://localhost:3031/api/v1`
  },
  webhook_ip: 'http://localhost:3020'
}
