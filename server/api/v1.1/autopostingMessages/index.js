'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./autopostingMessage.controller')
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')
const validate = require('express-jsonschema').validate

router.post('/getMessages/:id',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('autoposting_history'),
  auth.isUserAllowedToPerformThisAction('view_autoposting_feed_history'),
  validate({body: validationSchema.getMessagePayload}),
  controller.getMessages)

module.exports = router
