const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const controller = require('./sponsoredMessaging.controller')
const validationSchema = require('./validationSchema')

router.post('/',
  auth.isAuthenticated(),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/update/:id',
  auth.isAuthenticated(),
  validate({body: validationSchema.updatePayload}),
  controller.update
)

router.post('/send/:id',
  auth.isAuthenticated(),
  validate({body: validationSchema.updatePayload}),
  controller.send
)

router.delete('/:_id',
  auth.isAuthenticated(),
  controller.delete)

module.exports = router
