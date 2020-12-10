const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./smsBroadcasts.controller')

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.payload}),
  controller.index)

router.post('/sendBroadcast',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.sendBroadcastPayload}),
  controller.sendBroadcast)

router.post('/getCount',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.getCount)

router.get('/getTwilioNumbers',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.getTwilioNumbers)

router.get('/:id/analytics',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.analytics)

module.exports = router
