const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./company.controller')

router.get('/members', // fetch team acount members (users)
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('team_members_management'),
  auth.isUserAllowedToPerformThisAction('view_members'),
  controller.members)

router.get('/getAutomatedOptions',
  auth.isAuthenticated(),
  controller.getAutomatedOptions)

router.get('/getAdvancedSettings',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('advanced_settings'),
  auth.isUserAllowedToPerformThisAction('manage_advanced_settings'),
  controller.getAdvancedSettings)

router.post('/updateAdvancedSettings',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('advanced_settings'),
  auth.isUserAllowedToPerformThisAction('manage_advanced_settings'),
  controller.updateAdvancedSettings)

router.post('/invite', // invite user to jion team account
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('invite_members'),
  auth.isUserAllowedToPerformThisAction('invite_members'),
  controller.invite)

router.post('/updateRole', // update user role
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('team_members_management'),
  auth.isUserAllowedToPerformThisAction('update_role'),
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
  auth.doesPlanPermitsThisAction('advanced_settings'),
  auth.isUserAllowedToPerformThisAction('manage_advanced_settings'),
  controller.getAdvancedSettings)

router.post('/updateAdvancedSettings',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('advanced_settings'),
  auth.isUserAllowedToPerformThisAction('manage_advanced_settings'),
  validate({body: validationSchema.advancedSettingsPayload}),
  controller.updateAdvancedSettings)

module.exports = router
