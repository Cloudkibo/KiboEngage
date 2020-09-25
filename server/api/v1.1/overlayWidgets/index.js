
'use strict'

var express = require('express')
var controller = require('./overlayWidgets.controller')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')
var router = express.Router()
const auth = require('../../../auth/auth.service')

router.delete('/delete/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.delete)

router.post('/create',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/fetchWidgets',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.fetchPayload}),
  controller.fetchWidgets)

router.post('/update/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.update)

module.exports = router
