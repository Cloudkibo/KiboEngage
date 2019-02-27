'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./twitter.controller')
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')
const validate = require('express-jsonschema').validate

router.post('/twitterAutoposting',
  // auth.isItWebhookServer(),
  validate({body: validationSchema.twitterwebhookPayload}),
  controller.twitterwebhook)
router.get('/findAutoposting', auth.isItWebhookServer(), controller.findAutoposting)

module.exports = router
