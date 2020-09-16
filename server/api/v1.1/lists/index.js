const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./lists.controller')

router.get('/allLists',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('segmentation_lists'),
  auth.isUserAllowedToPerformThisAction('view_segmentation_lists'),
  controller.allLists)

router.post('/getAll',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('segmentation_lists'),
  auth.isUserAllowedToPerformThisAction('view_segmentation_lists'),
  validate({body: validationSchema.getAllPayload}),
  controller.getAll)

router.post('/createList',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('segmentation_lists'),
  auth.isUserAllowedToPerformThisAction('create_segmentation_lists'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/editList',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('segmentation_lists'),
  auth.isUserAllowedToPerformThisAction('update_segmentation_lists'),
  validate({body: validationSchema.editPayload}),
  controller.editList)

router.get('/viewList/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('segmentation_lists'),
  auth.isUserAllowedToPerformThisAction('view_segmentation_lists'),
  controller.viewList)

router.delete('/deleteList/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('segmentation_lists'),
  auth.isUserAllowedToPerformThisAction('delete_segmentation_lists'),
  controller.deleteList)

router.get('/repliedPollSubscribers',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('polls'),
  auth.isUserAllowedToPerformThisAction('view_polls'),
  controller.repliedPollSubscribers)

router.get('/repliedSurveySubscribers',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('surveys'),
  auth.isUserAllowedToPerformThisAction('view_surveys'),
  controller.repliedSurveySubscribers)

module.exports = router
