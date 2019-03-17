const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./smsBroadcasts.controller')

router.post('/',
  auth.isAuthenticated(),
  controller.index)

router.post('/sendBroadcast',
  auth.isAuthenticated(),
  validate({body: validationSchema.sendBroadcastPayload}),
  controller.sendBroadcast)

router.get('/getTwilioNumbers',
  auth.isAuthenticated(),
  controller.getTwilioNumbers)

module.exports = router
