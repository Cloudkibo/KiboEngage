const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./company.controller')
const { attachProviderInfo } = require('../../middleware/whatsApp.middleware')

router.get('/members',
  auth.isAuthenticated(),
  controller.members)

router.get('/getAutomatedOptions',
  auth.isAuthenticated(),
  controller.getAutomatedOptions)

router.get('/getAdvancedSettings',
  auth.isAuthenticated(),
  controller.getAdvancedSettings)

router.post('/updateAdvancedSettings',
  auth.isAuthenticated(),
  controller.updateAdvancedSettings)

router.post('/invite', auth.isAuthenticated(), controller.invite)

router.post('/updateRole',
  auth.isAuthenticated(),
  controller.updateRole)

router.post('/updateAutomatedOptions',
  auth.isAuthenticated(),
  auth.hasRole('buyer'),
  controller.updateAutomatedOptions)

router.post('/updatePlatform',
  auth.isAuthenticated(),
  validate({body: validationSchema.updatePlatformPayload}),
  controller.updatePlatform)

router.post('/fetchValidCallerIds',
  auth.isAuthenticated(),
  validate({body: validationSchema.fetchValidCallerIds}),
  controller.fetchValidCallerIds)

router.post('/updatePlatformWhatsApp',
  auth.isAuthenticated(),
  validate({body: validationSchema.updatePlatformWhatsApp}),
  controller.updatePlatformWhatsApp)

router.post('/disconnect',
  auth.isAuthenticated(),
  validate({body: validationSchema.disconnect}),
  controller.disconnect)

router.post('/deleteWhatsAppInfo',
  auth.isAuthenticated(),
  validate({body: validationSchema.deleteWhatsAppInfo}),
  controller.deleteWhatsAppInfo)

router.get('/getAdvancedSettings',
  auth.isAuthenticated(),
  controller.getAdvancedSettings)

router.post('/updateAdvancedSettings',
  auth.isAuthenticated(),
  validate({body: validationSchema.advancedSettingsPayload}),
  controller.updateAdvancedSettings)

router.post('/disableMember',
  auth.isAuthenticated(),
  validate({body: validationSchema.disableMember}),
  controller.disableMember)

router.post('/enableMember',
  auth.isAuthenticated(),
  validate({body: validationSchema.enableMember}),
  controller.enableMember)

router.get('/getWhatsAppMessageTemplates',
  auth.isAuthenticated(),
  attachProviderInfo(),
  controller.getWhatsAppMessageTemplates)

module.exports = router
