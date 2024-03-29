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
    uri: 'mongodb://localhost/kiboengage-test'
  },
  seedDB: false,
  facebook: {
    clientID: process.env.FACEBOOK_ID || '159385484629940',
    clientSecret: process.env.FACEBOOK_SECRET || '67527aa04570a034b6ff67335d95e91c',
    callbackURL: `${process.env.DOMAIN || 'https://kibopush-faizan.ngrok.io'}/auth/facebook/callback`
  },

  api_urls: {
    webhook: 'https://kibopush-anisha.ngrok.io',
    kibopush: 'http://localhost:3000/api',
    accounts: 'http://localhost:3024/api/v1',
    chat: 'http://localhost:3022/api',
    kibochat: `http://localhost:3030/api/v1`,
    kiboengage: `http://localhost:3031/api/v1`,
    kibodash: `http://localhost:5050/api/v1`
  },
  webhook_ip: 'http://localhost:3020',
  marketingApiAccessToken: 'EAAB4wFi3BuIBAIZC1zrUcVU4jMH0B16E4qcsgZBw8pKyQF5yBO1xyZAZBsh1tzDmwON6ypZBMbUyFWQgtKu1m8Odprb5SopXyxnvNWigd0dQb6TbNXkPRg8I3mV50QrRBcZAre56lYaPHzWwaSFOZBP5d9ZBCRuolHWIOp81lBZCqqlDGqZAzBZBZCmUBbGu1fkbw0UZD'
}
