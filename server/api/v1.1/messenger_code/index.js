const express = require('express')
const router = express.Router()
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./m_code.controller')
const auth = require('./../../../auth/auth.service')

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('messenger_code'),
  auth.isUserAllowedToPerformThisAction('view_messenger_codes'),
  controller.index)

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('messenger_code'),
  auth.isUserAllowedToPerformThisAction('create_messenger_codes'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/edit/:_id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('messenger_code'),
  auth.isUserAllowedToPerformThisAction('update_messenger_codes'),
  validate({body: validationSchema.updatePayload}),
  controller.update)

router.delete('/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('messenger_code'),
  auth.isUserAllowedToPerformThisAction('delete_messenger_codes'),
  controller.delete)

router.get('/getQRCode/:pageId',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('messenger_code'),
  auth.isUserAllowedToPerformThisAction('view_messenger_codes'),
  controller.getQRCode)

module.exports = router
