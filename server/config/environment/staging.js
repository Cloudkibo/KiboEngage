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
  hubspot: {
    client_id: process.env.HUBSPOT_CLIENT_ID || '7380eb30-23d2-4801-b772-a01f8ad3195f',
    client_secret: process.env.HUBSPOT_CLIENT_SECRET || 'eae28ea4-5e91-4a65-aa8b-3b2317fef2f7',
    callbackURL: `${process.env.DOMAIN || 'https://kibopush-faizan.ngrok.io'}/api/hubspotIntegrations/callback`,
    scopes: 'contacts%20forms%20oauth'
  },
  api_urls: {
    webhook: 'https://swebhook.cloudkibo.com',
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
