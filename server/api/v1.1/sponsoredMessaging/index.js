const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const attachBuyerInfo = require('./../../global/utility').attachBuyerInfo

const controller = require('./sponsoredMessaging.controller')
const validationSchema = require('./validationSchema')

router.post('/fetchSponsoredMessages',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('sponsored_broadcast'),
  auth.isUserAllowedToPerformThisAction('view_sponsored_broadcast'),
  attachBuyerInfo(),
  controller.index)

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('sponsored_broadcast'),
  auth.isUserAllowedToPerformThisAction('create_sponsored_broadcast'),
  validate({ body: validationSchema.createPayload }),
  controller.create)

router.post('/update/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('sponsored_broadcast'),
  auth.isUserAllowedToPerformThisAction('update_sponsored_broadcast'),
  validate({ body: validationSchema.updatePayload }),
  controller.update
)

router.post('/send/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('sponsored_broadcast'),
  auth.isUserAllowedToPerformThisAction('create_sponsored_broadcast'),
  validate({ body: validationSchema.updatePayload }),
  attachBuyerInfo(),
  controller.send
)

router.post('/sendInSandbox/:id',
  // auth.isAuthenticated(),
  validate({ body: validationSchema.updatePayload }),
  controller.sendInSandbox
)

router.delete('/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('sponsored_broadcast'),
  auth.isUserAllowedToPerformThisAction('delete_sponsored_broadcast'),
  controller.delete)

router.get('/insights/:ad_id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('sponsored_broadcast'),
  auth.isUserAllowedToPerformThisAction('view_sponsored_broadcast'),
  attachBuyerInfo(),
  controller.getInsight
)

router.get('/adAccounts',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('sponsored_broadcast'),
  auth.isUserAllowedToPerformThisAction('create_sponsored_broadcast'),
  attachBuyerInfo(),
  controller.adAccounts
)

router.post('/campaigns',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('sponsored_broadcast'),
  auth.isUserAllowedToPerformThisAction('create_campaign'),
  validate({ body: validationSchema.createCampaignsPayload }),
  attachBuyerInfo(),
  controller.campaigns
)

router.get('/campaigns/:ad_account_id',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('sponsored_broadcast'),
  auth.isUserAllowedToPerformThisAction('create_sponsored_broadcast'),
  attachBuyerInfo(),
  controller.fetchCampaigns
)

router.post('/adSets',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('sponsored_broadcast'),
  auth.isUserAllowedToPerformThisAction('create_adset'),
  validate({ body: validationSchema.createCampaignsPayload }),
  attachBuyerInfo(),
  controller.adSets
)

router.get('/adSets/:ad_campaign_id',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('sponsored_broadcast'),
  auth.isUserAllowedToPerformThisAction('create_sponsored_broadcast'),
  attachBuyerInfo(),
  controller.fetchAdSets
)

module.exports = router
