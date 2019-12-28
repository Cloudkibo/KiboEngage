'use strict'

const express = require('express')

const router = express.Router()
const validate = require('express-jsonschema').validate
const controller = require('./rssFeeds.controller')
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')

router.post('/create',
  auth.isAuthenticated(),
  validate({body: validationSchema.createPayload}),
  controller.create)

module.exports = router
