/**
 * Created by sojharo on 27/07/2017.
 */

'use strict'

const express = require('express')

const router = express.Router()
const auth = require('../../../auth/auth.service')
const controller = require('./hubspotIntegration.controller')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.get('/auth', controller.auth)

router.get('/callback', controller.callback)

module.exports = router