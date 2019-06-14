'use strict'

// Staging specific configuration
// ==================================
module.exports = {

  // Server port
  port: process.env.PORT || 3000,

  // Secure Server port
  secure_port: process.env.SECURE_PORT || 8443,

  domain: `${process.env.DOMAIN || 'https://skiboengage.cloudkibo.com'}`,

  // MongoDB connection options
  mongo: {
    uri: 'mongodb://localhost/kiboengage-staging'
  },
  seedDB: false,
  facebook: {
    clientID: process.env.FACEBOOK_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: `${process.env.DOMAIN}/auth/facebook/callback`
  },

  api_urls: {
    webhook: 'https://swebhook.cloudkibo.com/api',
    kibopush: 'https://staging.kibopush.com/api',
    accounts: 'https://saccounts.cloudkibo.com/api/v1',
    chat: 'https://skibochat.cloudkibo.com/api',
    kibochat: `${process.env.DB_LAYER_IP_KIBOCHAT}/api/v1`,
    kiboengage: `${process.env.DB_LAYER_IP_KIBOENGAGE}/api/v1`,
    kibodash: `${process.env.KIBODASH}/api/v1`
  },
  webhook_ip: process.env.WEBHOOK_IP_ADDRESS || 'localhost',
  marketingApiAccessToken: 'EAAB4wFi3BuIBAIZC1zrUcVU4jMH0B16E4qcsgZBw8pKyQF5yBO1xyZAZBsh1tzDmwON6ypZBMbUyFWQgtKu1m8Odprb5SopXyxnvNWigd0dQb6TbNXkPRg8I3mV50QrRBcZAre56lYaPHzWwaSFOZBP5d9ZBCRuolHWIOp81lBZCqqlDGqZAzBZBZCmUBbGu1fkbw0UZD'

}
