
'use strict'

var express = require('express')
var controller = require('./invitations.controller')

var router = express.Router()
const auth = require('../../../auth/auth.service')

router.get('/',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('invite_team'),
  auth.doesRolePermitsThisAction('invitationsPermission'),
  controller.index)

router.post('/cancel',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('invite_team'),
  auth.doesRolePermitsThisAction('invitationsPermission'),
  controller.cancel)

module.exports = router
