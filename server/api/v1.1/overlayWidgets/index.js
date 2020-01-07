
'use strict'

var express = require('express')
var controller = require('./overlayWidgets.controller')

var router = express.Router()
const auth = require('../../../auth/auth.service')

router.get('/delete/:id',
  auth.isAuthenticated(),
  controller.delete)

module.exports = router
