
'use strict'

var express = require('express')
var controller = require('./integrations.controller')

var router = express.Router()
const auth = require('../../../auth/auth.service')

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.isUserAllowedToPerformThisAction('manage_integrations'),
  controller.index)

router.post('/update/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.isUserAllowedToPerformThisAction('manage_integrations'),
  controller.update)

module.exports = router
