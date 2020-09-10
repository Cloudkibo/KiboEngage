
'use strict'

var express = require('express')
var controller = require('./invitations.controller')

const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

var router = express.Router()
const auth = require('../../../auth/auth.service')

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('invite_team'),
  auth.doesRolePermitsThisAction('invitationsPermission'),
  controller.index)

router.post('/cancel',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('invite_team'),
  auth.doesRolePermitsThisAction('invitationsPermission'),
  controller.cancel)

router.post('/invite',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.invitePayload}),
  controller.invite)

module.exports = router
