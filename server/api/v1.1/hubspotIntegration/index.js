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

router.get('/listForms', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer(), controller.getForms)

router.post('/fetchFields',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.fetchColumnsPayload}),
  controller.fetchColumns)

router.get('/fetchHubspotDefaultColumns',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchHubspotDefaultColumns)

module.exports = router
