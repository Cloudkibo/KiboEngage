
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
  auth.doesPlanPermitsThisAction('overlay_widgets'),
  controller.delete)

router.post('/create',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('overlay_widgets'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/fetchWidgets',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('overlay_widgets'),
  validate({body: validationSchema.fetchPayload}),
  controller.fetchWidgets)

router.post('/update/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('overlay_widgets'),
  controller.update)

module.exports = router
