const express = require('express')
const router = express.Router()
const middleware = require('./middleware')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./controller')

router.post('/sendSMS',
  // authenticate
  validate({body: validationSchema.sendSMSPayload}),
  middleware.validateNumbers(),
  controller.sendSMS)

router.post('/receiveSMS',
  validate({body: validationSchema.receiveSMSPayload}),
  controller.receiveSMS)

module.exports = router
