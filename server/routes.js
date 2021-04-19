const config = require('./config/environment/index')
const { callApi } = require('./api/v1.1/utility')
const logger = require('./components/logger')
const TAG = 'server/routes.js'
const path = require('path')
const multiparty = require('connect-multiparty')
const multipartyMiddleware = multiparty()
const fs = require('fs')
const Sentry = require('@sentry/node')

module.exports = function (app) {
  const env = app.get('env')
  // API middlewares go here
  app.use('/api/v1/test', require('./api/v1/test'))
  app.use('/api/email_verification', require('./api/v1.1/verificationtoken'))
  app.use('/api/messengerEvents', require('./api/v1.1/messengerEvents'))
  app.use('/api/automationQueue', require('./api/v1.1/automationQueue'))
  app.use('/api/autoposting', require('./api/v1.1/autoposting'))
  app.use('/api/autoposting_messages', require('./api/v1.1/autopostingMessages'))
  app.use('/api/autoposting_fb_posts', require('./api/v1.1/autopostingFbPosts'))
  app.use('/api/broadcasts', require('./api/v1.1/broadcasts'))
  app.use('/api/facebookEvents', require('./api/v1.1/facebookEvents'))
  app.use('/api/twitterEvents', require('./api/v1.1/twitterEvents'))
  app.use('/api/invitations', require('./api/v1.1/invitations'))
  app.use('/api/invite_verification', require('./api/v1.1/inviteagenttoken'))
  app.use('/api/lists', require('./api/v1.1/lists'))
  app.use('/api/menu', require('./api/v1.1/menu'))
  app.use('/api/notifications', require('./api/v1.1/notifications'))
  app.use('/api/growthtools', require('./api/v1.1/phoneNumber'))
  app.use('/api/polls', require('./api/v1.1/polls'))
  app.use('/api/tags', require('./api/v1.1/tags'))
  app.use('/api/subscribers', require('./api/v1.1/subscribers'))
  app.use('/api/users', require('./api/v1.1/user'))
  app.use('/api/teams', require('./api/v1.1/teams'))
  app.use('/api/pages', require('./api/v1.1/pages'))
  app.use('/api/company', require('./api/v1.1/companyprofile'))
  app.use('/api/dashboard', require('./api/v1.1/dashboard'))
  app.use('/api/adminsubscriptions', require('./api/v1.1/pageadminsubscriptions'))
  app.use('/api/surveys', require('./api/v1.1/surveys'))
  app.use('/api/sequenceMessaging', require('./api/v1.1/sequenceMessaging'))
  app.use('/api/URL', require('./api/v1.1/URLForClickedCount'))
  app.use('/api/post', require('./api/v1.1/commentCapture'))
  app.use('/api/templates', require('./api/v1.1/templates'))
  app.use('/api/wordpressEvents', require('./api/v1.1/wordpressEvents'))
  app.use('/api/reset_password', require('./api/v1.1/passwordresettoken'))
  app.use('/api/messenger_code', require('./api/v1.1/messenger_code'))
  app.use('/api/scripts', require('./api/scripts'))
  app.use('/api/landingPage', require('./api/v1.1/landingPage'))
  app.use('/api/pageReferrals', require('./api/v1.1/pageReferrals'))
  app.use('/api/jsonAd', require('./api/v1.1/jsonAd'))
  app.use('/api/scripts', require('./api/v1.1/scripts'))
  app.use('/api/custom_fields', require('./api/v1.1/custom_fields'))
  app.use('/api/custom_field_subscribers/', require('./api/v1.1/custom_field_subscribers'))
  app.use('/api/operational', require('./api/v1.1/kiboDash'))
  app.use('/api/contacts', require('./api/v1.1/contacts'))
  app.use('/api/whatsAppContacts', require('./api/v1.1/whatsAppContacts'))
  app.use('/api/whatsAppBroadcasts', require('./api/v1.1/whatsAppBroadcasts'))
  app.use('/api/smsBroadcasts', require('./api/v1.1/smsBroadcasts'))
  app.use('/api/smsDashboard', require('./api/v1.1/smsDashboard'))
  app.use('/api/whatsAppDashboard', require('./api/v1.1/whatsAppDashboard'))
  app.use('/api/backdoor', require('./api/v1.1/backdoor'))
  app.use('/api/sponsoredmessaging', require('./api/v1.1/sponsoredMessaging'))
  app.use('/api/webhooks', require('./api/v1.1/webhooks'))
  app.use('/api/rss', require('./api/v1.1/rss'))
  app.use('/api/abandonedCarts', require('./api/v1.1/abandoned_carts'))
  app.use('/api/shopify', require('./api/v1.1/shopify'))
  app.use('/api/api_ngp', require('./api/v1.1/api_ngp'))
  app.use('/api/messageStatistics', require('./api/v1.1/messageStatistics'))
  app.use('/api/twilioEvents', require('./api/v1.1/twilioEvents'))
  app.use('/api/ip2country', require('./api/v1.1/ipcountry'))
  app.use('/api/integrations', require('./api/v1.1/integrations'))
  app.use('/api/sheetsIntegrations', require('./api/v1.1/sheetsIntegration'))
  app.use('/api/hubspotIntegrations', require('./api/v1.1/hubspotIntegration'))
  app.use('/api/newsSections', require('./api/v1.1/newsSections'))
  app.use('/clicked', require('./api/v1.1/clickedCount/clickedCount.controller').updateClickedCount)
  app.use('/api/overlayWidgets', require('./api/v1.1/overlayWidgets'))
  app.use('/api/appMaker', require('./api/appMaker'))
  app.use('/api/reroute', require('./api/v1.1/Whatsapp Link Re-Routing'))
  app.use('/api/twilio', require('./api/v1.1/twilio'))
  app.use('/api/flockSendEvents', require('./api/v1.1/flockSendEvents'))
  app.use('/api/whatsAppEvents', require('./api/v1.1/whatsAppEvents'))
  app.use('/api/permissions', require('./api/v1/permissions'))
  app.use('/api/companyPreferences', require('./api/v1.1/companyPreferences'))
  app.use('/api/featureUsage', require('./api/v1.1/featureUsage'))

  // auth middleware go here if you authenticate on same server
  app.use('/auth', require('./auth'))

  app.get('/', (req, res) => {
    res.cookie('environment', config.env,
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_production', 'https://kiboengage.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_staging', 'https://skiboengage.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_development', 'http://localhost:3021',
      { expires: new Date(Date.now() + 900000) })
    res.sendFile(path.join(config.root, 'client/index.html'))
  })

  app.post('/uploadHtml',
    multipartyMiddleware,
    (req, res) => {
      let dir = path.resolve(__dirname, '../client/', req.files.bundle.name)

      fs.rename(
        req.files.bundle.path,
        dir,
        err => {
          if (err) {
            return res.status(500).json({
              status: 'failed',
              description: 'internal server error' + JSON.stringify(err)
            })
          }
          return res.status(201).json({ status: 'success', description: 'HTML uploaded' })
        }
      )
    })

  app.get('/react-bundle', (req, res) => {
    res.sendFile(path.join(__dirname, '../../KiboPush/client/public/js', 'bundle.js'))
  })

  app.post('/api/receiveSocketEvent', (req, res) => {
    require('./config/socketio').sendMessageToClient(req.body)
    return res.status(201).json({ status: 'success', description: 'socket event received' })
  })

  app.get('/landingPage/:id', (req, res) => {
    callApi('landingPage/query', 'post', { _id: req.params.id })
      .then(landingPages => {
        let landingPage = landingPages[0]
        landingPage.state = landingPages[0].initialState
        landingPage.facebookClientId = config.facebook.clientID
        landingPage.currentState = 'initial'
        res.render('landingPage', { landingPage })
      })
      .catch(err => {
        const message = err || 'Error occured in landingPage'
        logger.serverLog(message, `${TAG}: /landingPage/${req.params.id}`, {}, {}, 'error')
      })
  })

  app.post('/landingPage/:id', (req, res) => {
    let landingPage = req.body
    landingPage.state = req.body.submittedState.state
    landingPage.state.title = req.body.submittedState.title
    landingPage.state.description = req.body.submittedState.description
    landingPage.state.buttonText = req.body.submittedState.buttonText
    res.render('landingPage', { landingPage })
  })

  app.get('/demoSSA', (req, res) => {
    res.cookie('environment', config.env,
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_production', 'https://kiboengage.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_staging', 'https://skiboengage.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_development', 'http://localhost:3021',
      { expires: new Date(Date.now() + 900000) })
    res.sendFile(path.join(config.root, 'client/index.html'))
  })

  app.get('/successMessage', (req, res) => {
    res.cookie('environment', config.env,
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_production', 'https://kiboengage.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_staging', 'https://skiboengage.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_development', 'http://localhost:3021',
      { expires: new Date(Date.now() + 900000) })
    res.sendFile(path.join(config.root, 'client/index.html'))
  })

  app.get('/successMessage', (req, res) => {
    res.cookie('environment', config.env,
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_production', 'https://kiboengage.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_staging', 'https://skiboengage.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_development', 'http://localhost:3021',
      { expires: new Date(Date.now() + 900000) })
    res.sendFile(path.join(config.root, 'client/index.html'))
  })

  app.get('/ErrorMessage', (req, res) => {
    res.cookie('environment', config.env,
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_production', 'https://kiboengage.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_staging', 'https://skiboengage.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_development', 'http://localhost:3021',
      { expires: new Date(Date.now() + 900000) })
    res.sendFile(path.join(config.root, 'client/index.html'))
  })

  app.route('/:url(api|auth)/*').get((req, res) => {
    res.status(404).send({ url: `${req.originalUrl} not found` })
  }).post((req, res) => {
    res.status(404).send({ url: `${req.originalUrl} not found` })
  })

  app.route('/*').get((req, res) => {
    res.redirect('/')
  }).post((req, res) => {
    res.redirect('/')
  })

  /*
    Setup a general error handler for JsonSchemaValidation errors.
  */
  app.use(function (err, req, res, next) {
    if (err.name === 'JsonSchemaValidation') {
      const responseData = {
        statusText: 'Bad Request',
        jsonSchemaValidation: true,
        validations: err.validations
      }

      const message = err || `JsonSchemaValidation error`
      logger.serverLog(message, `${TAG}: ${req.path ? req.path : req.originalUrl}`, req.body, {responseData}, 'error')

      res.status(400).json(responseData)
    } else {
      // pass error to next error middleware handler
      next(err)
    }
  })

  if (config.env === 'production' || config.env === 'staging') {
    app.use(Sentry.Handlers.errorHandler())
    app.use(Sentry.Handlers.requestHandler())
  }
}
