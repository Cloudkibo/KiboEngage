const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./company.controller')
const { attachProviderInfo } = require('../../middleware/whatsApp.middleware')

router.get('/members',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.members)

router.get('/getAutomatedOptions',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.getAutomatedOptions)

router.get('/getAdvancedSettings',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.getAdvancedSettings)

router.post('/updateAdvancedSettings',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.updateAdvancedSettings)

router.post('/invite',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.invite)

router.post('/updateRole',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.updateRole)

router.post('/updateAutomatedOptions',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.hasRole('buyer'),
  controller.updateAutomatedOptions)

router.post('/connectSMS',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.connectSMS}),
  controller.connectSMS)

router.post('/fetchValidCallerIds',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.fetchValidCallerIds}),
  controller.fetchValidCallerIds)

router.post('/updatePlatformWhatsApp',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.updatePlatformWhatsApp}),
  controller.updatePlatformWhatsApp)

router.post('/disconnect',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.disconnect}),
  controller.disconnect)

router.post('/deleteWhatsAppInfo',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.deleteWhatsAppInfo}),
  controller.deleteWhatsAppInfo)

router.get('/getAdvancedSettings',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.getAdvancedSettings)

router.post('/updateAdvancedSettings',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.advancedSettingsPayload}),
  controller.updateAdvancedSettings)

router.post('/disableMember',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.disableMember}),
  controller.disableMember)

router.post('/enableMember',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.enableMember}),
  controller.enableMember)

router.get('/getWhatsAppMessageTemplates',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  attachProviderInfo(),
  controller.getWhatsAppMessageTemplates)

module.exports = router
