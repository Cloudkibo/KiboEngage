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
  hubspot: {
    client_id: process.env.HUBSPOT_CLIENT_ID || '7380eb30-23d2-4801-b772-a01f8ad3195f',
    client_secret: process.env.HUBSPOT_CLIENT_SECRET || 'eae28ea4-5e91-4a65-aa8b-3b2317fef2f7',
    callbackURL: `${process.env.DOMAIN || 'https://kibopush-sojharo.ngrok.io'}/api/hubspotIntegrations/callback`,
    scopes: 'contacts%20forms%20oauth'
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
  marketingApiAccessToken: 'EAACQ9dMxl7QBABfKeZAIUELHJkO9ZAFFc16HTZBzOCsEglkIK1rxXNSPQl8NVwhYB3FOHxLRlNZBZCINLBy7rMrXwnvUYW8xI9urq9NjxmRupbQDNbhhGVWClb7hwBbNHTUiPk8odMm1Hav9OfkX6bbTlWdLhxXUHXQjkELacoAZDZD'
}
