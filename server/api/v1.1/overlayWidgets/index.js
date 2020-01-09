
'use strict'

var express = require('express')
var controller = require('./overlayWidgets.controller')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')
var router = express.Router()
const auth = require('../../../auth/auth.service')

router.delete('/delete/:id',
  auth.isAuthenticated(),
  controller.delete)

router.post('/create',
  auth.isAuthenticated(),
  validate({body: validationSchema.createPayload}),
  controller.create)

module.exports = router
