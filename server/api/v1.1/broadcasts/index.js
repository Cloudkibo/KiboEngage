'use strict'

const express = require('express')

const router = express.Router()

const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')
const controller = require('./broadcasts.controller')
const auth = require('../../../auth/auth.service')
const multiparty = require('connect-multiparty')
const multipartyMiddleware = multiparty()

router.post('/allBroadcasts',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.doesRolePermitsThisAction('broadcastPermission'),
  validate({body: validationSchema.allBroadcastsPayload}),
  controller.index)

router.post('/sendConversation',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.doesRolePermitsThisAction('broadcastPermission'),
  multipartyMiddleware,
  controller.sendConversation)

router.post('/upload',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.doesRolePermitsThisAction('broadcastPermission'),
  multipartyMiddleware,
  controller.upload)

router.post('/uploadTemplate',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.doesRolePermitsThisAction('broadcastPermission'),
  controller.uploadForTemplate)

router.get('/delete/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.doesRolePermitsThisAction('broadcastPermission'),
  controller.delete)

router.post('/addButton',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.doesRolePermitsThisAction('broadcastPermission'),
  validate({body: validationSchema.addButtonPayload}),
  controller.addButton)

router.post('/addCardAction',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.doesRolePermitsThisAction('broadcastPermission'),
  controller.addCardAction)

router.post('/editButton',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.doesRolePermitsThisAction('broadcastPermission'),
  validate({body: validationSchema.editButtonPayload}),
  controller.editButton)

router.delete('/deleteButton/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.doesRolePermitsThisAction('broadcastPermission'),
  controller.deleteButton)

router.get('/download/:id', controller.download)

router.get('/retrieveReachEstimation/:page_id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.doesRolePermitsThisAction('broadcastPermission'),
  controller.retrieveReachEstimation)

router.post('/retrieveSubscribersCount',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.doesRolePermitsThisAction('broadcastPermission'),
  validate({body: validationSchema.subscriberCountPayload}),
  controller.retrieveSubscribersCount)

router.post('/urlMetaData/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.urlMetaData)

router.post('/sendUserInputComponent/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.sendUserInputComponent)

module.exports = router
