'use strict'

const express = require('express')

const router = express.Router()
const validate = require('express-jsonschema').validate
const controller = require('./polls.controller')
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')

router.get('/all/:days',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('polls'),
  auth.isUserAllowedToPerformThisAction('view_polls'),
  controller.index)

router.post('/allPolls',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('polls'),
  auth.isUserAllowedToPerformThisAction('view_polls'),
  validate({body: validationSchema.allPollsPayload}),
  controller.allPolls)

router.post('/create',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('polls'),
  auth.isUserAllowedToPerformThisAction('create_polls'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/send',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('polls'),
  auth.isUserAllowedToPerformThisAction('resend_polls'),
  controller.send)

router.post('/sendPollDirectly',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('polls'),
  auth.isUserAllowedToPerformThisAction('create_polls'),
  validate({body: validationSchema.createPayload}),
  controller.sendPollDirectly)

router.get('/responses/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('polls'),
  auth.isUserAllowedToPerformThisAction('view_poll_reports'),
  controller.getresponses)

router.get('/allResponses',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('polls'),
  auth.isUserAllowedToPerformThisAction('view_poll_reports'),
  controller.getAllResponses)

router.delete('/deletePoll/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('polls'),
  auth.isUserAllowedToPerformThisAction('delete_polls'),
  controller.deletePoll)

module.exports = router
