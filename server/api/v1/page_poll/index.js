const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./pages.controller')

router.get('/',
  auth.isAuthenticated(),
  controller.index)

router.get('/connectedPages',
  auth.isAuthenticated(),
  controller.connectedPages)

router.get('/enable',
  auth.isAuthenticated(),
  validate({body: validationSchema.pagePayload}),
  controller.enable)

router.get('/disable',
  auth.isAuthenticated(),
  validate({body: validationSchema.pagePayload}),
  controller.disable)

router.get('/createWelcomeMessage',
  auth.isAuthenticated(),
  validate({body: validationSchema.welcomeMessagePayload}),
  controller.createWelcomeMessage)

router.get('/isWelcomeMessageEnabled',
  auth.isAuthenticated(),
  validate({body: validationSchema.enableDisableWelcomeMessagePayload}),
  controller.createWelcomeMessage)

router.post('/saveGreetingText',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.doesRolePermitsThisAction('pagesPermission'),
  controller.saveGreetingText)

module.exports = router
