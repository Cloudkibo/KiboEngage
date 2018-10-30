const config = require('./config/environment/index')

module.exports = function (app) {
  const env = app.get('env')
  // API middlewares go here
  app.use('/api/v1/test', require('./api/v1/test'))
  app.use('/api/messengerEvents', require('./api/v1/messengerEvents'))
  app.use('/api/automationQueue', require('./api/v1/automationQueue'))
  app.use('/api/autoposting', require('./api/v1/autoposting'))
  app.use('/api/autoposting_messages', require('./api/v1/autopostingMessages'))
  app.use('/api/broadcasts', require('./api/v1/broadcasts'))
  app.use('/api/facebookEvents', require('./api/v1/facebookEvents'))
  app.use('/api/invitations', require('./api/v1/invitations'))
  app.use('/api/invite_verification', require('./api/v1/inviteagenttoken'))
  app.use('/api/ip2country', require('./api/v1/ipcountry'))
  app.use('/api/lists', require('./api/v1/lists'))
  app.use('/api/menu', require('./api/v1/menu'))
  app.use('/api/notifications', require('./api/v1/notifications'))
  app.use('/api/growthtools', require('./api/v1/phoneNumber'))
  app.use('/api/polls', require('./api/v1/polls'))
  app.use('/api/tags', require('./api/v1/tags'))
  app.use('/api/subscribers', require('./api/v1/subscribers'))
  app.use('/api/users', require('./api/v1/user'))
  app.use('/api/teams', require('./api/v1/teams'))
  app.use('/api/pages', require('./api/v1/pages'))
  app.use('/api/company', require('./api/v1/companyprofile'))
  app.use('/api/dashboard', require('./api/v1/dashboard'))
  app.use('/api/pageadminsubscriptions', require('./api/v1/pageadminsubscriptions'))
  app.use('/api/surveys', require('./api/v1/surveys'))
  app.use('/api/adminsubscriptions', require('./api/v1/pageadminsubscriptions'))
  app.use('/api/sequenceMessaging', require('./api/v1/sequenceMessaging'))
  app.use('/api/surveys', require('./api/v1/surveys'))
  app.use('/api/URL', require('./api/v1/URLForClickedCount'))
  app.use('/api/tags', require('./api/v1/tags'))
  app.use('/api/commentCapture', require('./api/v1/commentCapture'))


  // auth middleware go here if you authenticate on same server
  // app.use('/auth', require('./auth'))

  app.get('/', (req, res) => {
    res.cookie('environment', config.env,
      {expires: new Date(Date.now() + 900000)})
    // res.sendFile(path.join(config.root, 'client/index.html'))
    res.render('main', { environment: env })
  })

  app.get('/', (req, res) => {
    res.sendFile('./../client/build/index.html')
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
}
