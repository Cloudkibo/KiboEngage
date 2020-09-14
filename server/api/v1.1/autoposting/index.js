'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./autoposting.controller')
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')
const validate = require('express-jsonschema').validate
const { checkSMP } = require('../../middleware/SMPStatus.middleware')

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  checkSMP(),
  // auth.doesPlanPermitsThisAction('autoposting'),
  // auth.doesRolePermitsThisAction('autopostingPermission'),
  controller.index)

router.post('/create',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  // auth.doesPlanPermitsThisAction('autoposting'),
  // auth.doesRolePermitsThisAction('autopostingPermission'),
  validate({ body: validationSchema.createPayload }),
  controller.create)

router.post('/edit',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  // auth.doesPlanPermitsThisAction('autoposting'),
  // auth.doesRolePermitsThisAction('autopostingPermission'),
  validate({ body: validationSchema.editPayload }),
  controller.edit)

router.delete('/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  // auth.doesPlanPermitsThisAction('autoposting'),
  // auth.doesRolePermitsThisAction('autopostingPermission'),
  controller.destroy)

// endpoints to call from Webhook
router.post('/handleTweetModeration', auth.isItWebhookServer(), controller.handleTweetModeration)

module.exports = router
