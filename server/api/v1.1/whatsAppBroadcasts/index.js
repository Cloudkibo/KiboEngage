const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')
const controller = require('./whatsAppBroadcasts.controller')
const { attachProviderInfo } = require('../../middleware/whatsApp.middleware')

router.post('/',
  auth.isAuthenticated(),
  validate({body: validationSchema.payload}),
  controller.index)

router.post('/sendBroadcast',
  auth.isAuthenticated(),
  attachProviderInfo(),
  validate({body: validationSchema.sendBroadcastPayload}),
  controller.sendBroadcast)

router.post('/getCount',
  auth.isAuthenticated(),
  controller.getCount)

module.exports = router
