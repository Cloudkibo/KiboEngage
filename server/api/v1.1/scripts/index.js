'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./scripts.controller')
// const auth = require('../../../auth/auth.service')

router.get('/updateProfilePics',
  // auth.isAuthenticated(),
  controller.updateProfilePics)

module.exports = router
