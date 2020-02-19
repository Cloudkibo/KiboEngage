const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const attachBuyerInfo = require('./../../global/utility').attachBuyerInfo

const controller = require('./sponsoredMessaging.controller')
const validationSchema = require('./validationSchema')

router.post('/fetchSponsoredMessages',
  auth.isAuthenticated(),
  controller.index)

router.post('/',
  auth.isAuthenticated(),
  validate({ body: validationSchema.createPayload }),
  controller.create)

router.post('/update/:id',
  auth.isAuthenticated(),
  validate({ body: validationSchema.updatePayload }),
  controller.update
)

router.post('/send/:id',
  auth.isAuthenticated(),
  validate({ body: validationSchema.updatePayload }),
  controller.send
)

router.post('/sendInSandbox/:id',
  // auth.isAuthenticated(),
  validate({ body: validationSchema.updatePayload }),
  controller.sendInSandbox
)

router.delete('/:_id',
  auth.isAuthenticated(),
  controller.delete)

router.get('/insights/:ad_id',
  auth.isAuthenticated(),
  controller.getInsight
)

router.get('/adAccounts',
  auth.isAuthenticated(),
  attachBuyerInfo(),
  controller.adAccounts
)

router.post('/campaigns',
  auth.isAuthenticated(),
  validate({ body: validationSchema.createCampaignsPayload }),
  attachBuyerInfo(),
  controller.campaigns
)

router.get('/campaigns/:ad_account_id',
  auth.isAuthenticated(),
  attachBuyerInfo(),
  controller.fetchCampaigns
)

router.post('/adSets',
  auth.isAuthenticated(),
  validate({ body: validationSchema.createCampaignsPayload }),
  attachBuyerInfo(),
  controller.adSets
)

router.get('/adSets/:ad_campaign_id',
  auth.isAuthenticated(),
  attachBuyerInfo(),
  controller.fetchAdSets
)

module.exports = router
