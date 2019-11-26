/**
 * Created by sojharo on 27/07/2017.
 */

'use strict'

const express = require('express')

const router = express.Router()
const auth = require('../../../auth/auth.service')
const controller = require('./sheetsIntegration.controller')

// router.post('/',
//   auth.isAuthenticated(),
//   controller.index) //

// router.get('/install',
//   controller.install)

// router.get('/callback',
//   controller.callback)

module.exports = router
