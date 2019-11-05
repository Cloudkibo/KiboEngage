// Production specific configuration
// ==================================
module.exports = {

  // Server port
  port: process.env.PORT || 3000,

  // Secure Server port
  secure_port: process.env.SECURE_PORT || 8443,

  domain: `${process.env.DOMAIN || 'https://kiboengage.cloudkibo.com'}`,

  // MongoDB connection options
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost/kiboengage-prod'
  },
  seedDB: false,
  facebook: {
    clientID: process.env.FACEBOOK_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: `${process.env.DOMAIN}/auth/facebook/callback`
  },

  api_urls: {
    webhook: 'https://webhook.cloudkibo.com',
    kibopush: 'https://app.kibopush.com/api',
    accounts: 'https://accounts.cloudkibo.com/api/v1',
    chat: 'https://kibochat.cloudkibo.com/api',
    kibochat: `${process.env.DB_LAYER_IP_KIBOCHAT}/api/v1`,
    kiboengage: `${process.env.DB_LAYER_IP_KIBOENGAGE}/api/v1`,
    kibodash: `${process.env.KIBODASH}/api/v1`
  },
  webhook_ip: process.env.WEBHOOK_IP_ADDRESS || 'localhost',
  marketingApiAccessToken: 'EAAUTvApDOEYBAIDZA8niavVy4wTbNdFyJzkTaYFZCvGYi6lolruCFS8aBDZCkegQM1zoNAXUKAYZCDMbgANA9y0tFQLv4jiOKmDBsXeL8FMZAxkaXcwRJ3rrFHW5OkMAIXcdqUT9hb7IisM5J1xZB1dvh7a9yK7GbITD8M7ZBDsuAZDZD'
}
