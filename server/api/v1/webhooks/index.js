const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./webhooks.controller')

router.get('/', auth.isAuthenticated(), controller.index)

router.post('/create',
  validate({body: validationSchema.createSchema}),
  auth.isAuthenticated(),
  controller.create)

router.post('/edit',
  validate({body: validationSchema.editSchema}),
  auth.isAuthenticated(),
  controller.edit)

router.post('/enabled',
  validate({body: validationSchema.enabledSchema}),
  auth.isAuthenticated(),
  controller.isEnabled)

module.exports = router
