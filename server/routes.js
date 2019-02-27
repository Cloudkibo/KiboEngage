const config = require('./config/environment/index')
const { callApi } = require('./api/v1.1/utility')
const logger = require('./components/logger')
const utility = require('./components/utility')
const TAG = 'LandingPage'
const Raven = require('raven')
const path = require('path')

module.exports = function (app) {
  const env = app.get('env')
  // API middlewares go here
  app.use('/api/v1/test', require('./api/v1/test'))
  app.use('/api/api_settings', require('./api/v1.1/api_settings'))
  app.use('/api/messengerEvents', require('./api/v1.1/messengerEvents'))
  app.use('/api/automationQueue', require('./api/v1.1/automationQueue'))
  app.use('/api/autoposting', require('./api/v1.1/autoposting'))
  app.use('/api/autoposting_messages', require('./api/v1.1/autopostingMessages'))
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
  // app.use('/api/operational', require('./api/v1.1/kiboDash'))

  // auth middleware go here if you authenticate on same server
  app.use('/auth', require('./auth'))

  app.get('/', (req, res) => {
    res.cookie('environment', config.env,
      {expires: new Date(Date.now() + 900000)})
    // res.sendFile(path.join(config.root, 'client/index.html'))
    res.render('main', { environment: env })
  })

  app.get('/react-bundle', (req, res) => {
    res.sendFile(path.join(__dirname, '../../KiboPush/client/public/js', 'bundle.js'))
  })

  app.get('/landingPage/:id', (req, res) => {
    callApi('landingPage/query', 'post', {_id: req.params.id}, '')
      .then(landingPages => {
        let landingPage = landingPages[0]
        landingPage.state = landingPages[0].initialState
        landingPage.facebookClientId = config.facebook.clientID
        landingPage.currentState = 'initial'
        landingPage.setProtocolUrl = utility.setProtocolUrl
        res.render('landingPage', { landingPage })
      })
      .catch(err => {
        logger.serverLog(TAG, `Error occured in landingPage ${req.params.id} ${err}`)
      })
    // const landingPage = {
    //   "_id" : "5c35c01edf911d1da95206ec",
    //   "currentState": "initial",
    //   "isActive" : true,
    //   "companyId" : "5bf3bbcea130395422d6a2b6",
    //   "pageId" : {
    //     _id: "5bf3bdb3a130395422d6a2bc",
    //     pageName: 'New Page',
    //     pageId: "397022517417854"
    //   },
    //   "initialState" : {
    //     "_id" : "5c35c01edf911d1da95206ea",
    //     "title" : "Here is your widget headline. Click here to change it!",
    //     "description" : "We also put default text here. Make sure to turn it into a unique and valuable message.",
    //     "pageTemplate" : "text",
    //     "backgroundColor" : "#fff",
    //     "titleColor" : "#000",
    //     "descriptionColor" : "#000",
    //     "buttonText" : "Send To Messenger",
    //     "mediaType" : "image",
    //     "mediaLink" : "",
    //     "mediaPlacement" : "aboveHeadline",
    //     "__v" : 0
    //   },
    //   "submittedState" : {
    //       "actionType" : "SHOW_NEW_MESSAGE", "REDIRECT_TO_URL"
    //       "state" : "5c35c01edf911d1da95206eb",
    //       "title" : "Thank You for Reading Our Thank You Message!",
    //       "description" : "Once a user opt-ins through your form, he sees this. Unless you change it, of course.",
    //       "buttonText" : "View it in Messenger"
    //   },
    //   "optInMessage" : [
    //       {
    //           "id" : 1547026445599.0,
    //           "text" : "Welcome {{user_first_name}}! Thankyou for subscribing. The next post is coming soon, stay tuned!    P.S. If you ever want to unsubscribe just type \"stop\"",
    //           "componentType" : "text"
    //       }
    //   ],
    //   "__v" : 0
    // }
    // res.render('landingPage', { landingPage })
  })

  app.post('/landingPage/:id', (req, res) => {
    logger.serverLog(TAG, 'post request of landingPage is hit')
    let landingPage = req.body
    landingPage.state = req.body.submittedState.state
    landingPage.state.title = req.body.submittedState.title
    landingPage.state.description = req.body.submittedState.description
    landingPage.state.buttonText = req.body.submittedState.buttonText
    res.render('landingPage', { landingPage })
  })

  app.get('/demoSSA', (req, res) => {
    res.cookie('environment', config.env,
      {expires: new Date(Date.now() + 900000)})
    // res.sendFile(path.join(config.root, 'client/index.html'))
    res.render('main', { environment: env })
  })

  app.route('/:url(api|auth)/*').get((req, res) => {
    res.status(404).send({url: `${req.originalUrl} not found`})
  }).post((req, res) => {
    res.status(404).send({url: `${req.originalUrl} not found`})
  })

  app.route('/*').get((req, res) => {
    res.redirect('/')
  }).post((req, res) => {
    res.redirect('/')
  })

  if (env === 'production' || env === 'staging') {
    app.use(Raven.errorHandler())
  }
}
