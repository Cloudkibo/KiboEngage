const express = require('express')
const router = express.Router()
const controller = require('./controller')
const auth = require('../../auth/auth.service')

router.post('/twilio/sendSMS',
  auth.isAuthenticated(),
  controller.sendTwilioSMS)

module.exports = router
