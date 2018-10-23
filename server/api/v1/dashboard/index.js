

'use strict'

const express = require('express')

const router = express.Router()

const auth = require('../../../auth/auth.service')
const controller = require('./dashboard.controller')

router.get('/sentVsSeen/:pageId',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('dashboard'),
  auth.doesRolePermitsThisAction('dashboardPermission'),
  controller.sentVsSeen)
// todo this is also coded very badly
//  router.get('/otherPages', auth.isAuthenticated(), controller.otherPages)
// todo remove this, this is not being used, discuss
router.post('/enable',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('dashboard'),
  auth.doesRolePermitsThisAction('dashboardPermission'),
  controller.enable)
// todo remove this /disable, this is coded badly discuss with dayem
// router.post('/disable', auth.isAuthenticated(), controller.disable);
router.get('/stats',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('dashboard'),
  auth.doesRolePermitsThisAction('dashboardPermission'),
  controller.stats)

router.get('/toppages',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('dashboard'),
  auth.doesRolePermitsThisAction('dashboardPermission'),
  controller.toppages)

// todo remove this, after discuss - this id will be userid, this is bad code
router.get('/:id',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('dashboard'),
  auth.doesRolePermitsThisAction('dashboardPermission'),
  controller.index)

router.get('/graphData/:days',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('dashboard'),
  auth.doesRolePermitsThisAction('dashboardPermission'),
  controller.graphData)

router.post('/getAllSubscribers/:pageid',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('dashboard'),
  auth.doesRolePermitsThisAction('dashboardPermission'),
  controller.getAllSubscribers)

module.exports = router
