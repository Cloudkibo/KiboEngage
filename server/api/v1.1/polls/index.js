'use strict'

const express = require('express')

const router = express.Router()
const validate = require('express-jsonschema').validate
const controller = require('./polls.controller')
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')

router.get('/all/:days',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('polls'),
  auth.doesRolePermitsThisAction('pollsPermission'),
  controller.index)

router.post('/allPolls',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('polls'),
  auth.doesRolePermitsThisAction('pollsPermission'),
  validate({body: validationSchema.allPollsPayload}),
  controller.allPolls)

router.post('/create',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('polls'),
  auth.doesRolePermitsThisAction('pollsPermission'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/send',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('polls'),
  auth.doesRolePermitsThisAction('pollsPermission'),
  validate({body: validationSchema.createPayload}),
  controller.send)

router.post('/sendPollDirectly',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('polls'),
  auth.doesRolePermitsThisAction('pollsPermission'),
  validate({body: validationSchema.createPayload}),
  controller.sendPollDirectly)

router.get('/responses/:id',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('polls'),
  auth.doesRolePermitsThisAction('pollsPermission'),
  controller.getresponses)

router.get('/allResponses',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('polls'),
  auth.doesRolePermitsThisAction('pollsPermission'),
  controller.getAllResponses)

router.delete('/deletePoll/:id',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('polls'),
  auth.doesRolePermitsThisAction('pollsPermission'),
  controller.deletePoll)

module.exports = router
