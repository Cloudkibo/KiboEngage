/**
 * Created by sojharo on 27/07/2017.
 */

'use strict'

const express = require('express')

const router = express.Router()

const auth = require('../../../auth/auth.service')
const controller = require('./pages.controller')

router.get('/',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.doesRolePermitsThisAction('pagesAccessPermission'),
  controller.index) // this id will be userid

router.get('/allpages',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.doesRolePermitsThisAction('pagesAccessPermission'),
  controller.allpages)

router.post('/allConnectedPages',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.doesRolePermitsThisAction('pagesAccessPermission'),
  controller.getAllpages)

router.get('/otherPages',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.doesRolePermitsThisAction('pagesAccessPermission'),
  controller.otherPages)

router.post('/enable',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.doesRolePermitsThisAction('pagesPermission'),
  controller.enable)

router.post('/disable',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.doesRolePermitsThisAction('pagesPermission'),
  controller.disable)

router.get('/addpages',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.doesRolePermitsThisAction('pagesPermission'),
  controller.addPages)

router.post('/createWelcomeMessage',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.doesRolePermitsThisAction('pagesPermission'),
  controller.createWelcomeMessage)

router.post('/isWelcomeMessageEnabled',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.doesRolePermitsThisAction('pagesPermission'),
  controller.isWelcomeMessageEnabled)

router.post('/saveGreetingText',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.doesRolePermitsThisAction('pagesPermission'),
  controller.saveGreetingText)

module.exports = router
