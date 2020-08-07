'use strict'

const express = require('express')

const router = express.Router()

const auth = require('../../../auth/auth.service')
const controller = require('./dashboard.controller')

router.get('/integrationsData',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('google_sheets_integration'),
  auth.isUserAllowedToPerformThisAction('manage_integrations'),
  controller.integrationsData)

router.get('/sentVsSeen/:pageId',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.isUserAllowedToPerformThisAction('view_broadcasts'),
  controller.sentVsSeen)
// todo this is also coded very badly
//  router.get('/otherPages', auth.isAuthenticated(), controller.otherPages)
// todo remove this, this is not being used, discuss
router.post('/enable',
  auth.isAuthenticated(),
  // auth.doesPlanPermitsThisAction('dashboard'),
  // auth.doesRolePermitsThisAction('dashboardPermission'),
  controller.enable)
// todo remove this /disable, this is coded badly discuss with dayem
// router.post('/disable', auth.isAuthenticated(), controller.disable);
router.get('/stats',
  auth.isAuthenticated(),
  // auth.doesPlanPermitsThisAction('dashboard'),
  // auth.doesRolePermitsThisAction('dashboardPermission'),
  controller.stats)

router.get('/updateSubscriptionPermission',
  auth.isAuthenticated(),
  controller.updateSubscriptionPermission)

router.get('/toppages',
  auth.isAuthenticated(),
  controller.toppages)

// todo remove this, after discuss - this id will be userid, this is bad code
router.get('/:id',
  auth.isAuthenticated(),
  // auth.doesPlanPermitsThisAction('dashboard'),
  // auth.doesRolePermitsThisAction('dashboardPermission'),
  controller.index)

router.get('/graphData/:days',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.isUserAllowedToPerformThisAction('view_broadcasts'),
  controller.graphData)

router.post('/sentVsSeenNew',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.isUserAllowedToPerformThisAction('view_broadcasts'),
  controller.sentVsSeenNew)

router.post('/getAllSubscribers/:pageid',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('manage_subscribers'),
  auth.isUserAllowedToPerformThisAction('view_subscribers'),
  controller.getAllSubscribers)

router.post('/subscriberSummary',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('manage_subscribers'),
  auth.isUserAllowedToPerformThisAction('view_subscribers'),
  controller.subscriberSummary)

router.post('/fetchAutopostingDetails',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('autoposting'),
  auth.isUserAllowedToPerformThisAction('view_autoposting_feeds'),
  controller.fetchAutopostingDetails)

router.post('/fetchNewsIntegrations',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('news_integration'),
  auth.isUserAllowedToPerformThisAction('view_news_fedds'),
  controller.fetchNewsIntegrations)

module.exports = router
