/**
 * Created by sojharo on 27/07/2017.
 */

'use strict'

const express = require('express')

const router = express.Router()
const auth = require('../../../auth/auth.service')
const controller = require('./sheetsIntegration.controller')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

// router.post('/',
//   auth.isAuthenticated(),
//   controller.index) //

// router.get('/install',
//   controller.install)

router.get('/auth', controller.auth)

router.get('/callback', controller.callback)

router.get('/listSpreadSheets', 
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.listSpreadSheets)

router.post('/fetchWorksheets',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.fetchWorksheetsPayload}),
  controller.fetchWorksheets)

router.post('/fetchColumns',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.fetchColumnsPayload}),
  controller.fetchColumns)

module.exports = router
