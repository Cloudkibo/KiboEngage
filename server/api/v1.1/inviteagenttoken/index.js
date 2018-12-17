'use strict'

var express = require('express')
var controller = require('./inviteagenttoken.controller')

var router = express.Router()

router.get('/verify/:id', controller.verify)

module.exports = router
