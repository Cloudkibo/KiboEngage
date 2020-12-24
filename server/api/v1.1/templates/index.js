'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./templates.controller')
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')
const validate = require('express-jsonschema').validate

router.get('/allPolls',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('poll_templates'),
  auth.isUserAllowedToPerformThisAction('view_templates'),
  controller.allPolls)

router.post('/getAllPolls',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('poll_templates'),
  auth.isUserAllowedToPerformThisAction('view_templates'),
  controller.getAllPolls) // pagination

router.post('/createPoll',
  auth.isAuthorizedSuperUser(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('poll_templates'),
  auth.isUserAllowedToPerformThisAction('create_templates'),
  controller.createPoll)

router.post('/createSurvey',
  auth.isAuthorizedSuperUser(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('survey_templates'),
  auth.isUserAllowedToPerformThisAction('create_templates'),
  controller.createSurvey)

router.get('/allSurveys',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('survey_templates'),
  auth.isUserAllowedToPerformThisAction('view_templates'),
  controller.allSurveys)

router.post('/getAllSurveys',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('survey_templates'),
  auth.isUserAllowedToPerformThisAction('view_templates'),
  controller.getAllSurveys) // pagination

router.post('/createCategory',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.createCategory)

router.get('/allCategories',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.allCategories)

router.get('/surveyDetails/:surveyid',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('survey_templates'),
  auth.isUserAllowedToPerformThisAction('view_templates'),
  controller.surveyDetails)

router.get('/pollDetails/:pollid',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('poll_templates'),
  auth.isUserAllowedToPerformThisAction('view_templates'),
  controller.pollDetails)

router.delete('/deletePoll/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('poll_templates'),
  auth.isUserAllowedToPerformThisAction('delete_templates'),
  controller.deletePoll)

router.delete('/deleteSurvey/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('survey_templates'),
  auth.isUserAllowedToPerformThisAction('delete_templates'),
  controller.deleteSurvey)

router.delete('/deleteCategory/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.deleteCategory)

router.post('/editCategory',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.editCategory}),
  controller.editCategory)

router.post('/editPoll',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('poll_templates'),
  auth.isUserAllowedToPerformThisAction('update_templates'),
  controller.editPoll)

router.post('/editSurvey',
  auth.isAuthorizedSuperUser(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('survey_templates'),
  auth.isUserAllowedToPerformThisAction('update_templates'),
  controller.editSurvey)

router.post('/createBroadcast',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('broadcasts_templates'),
  auth.isUserAllowedToPerformThisAction('create_templates'),
  controller.createBroadcast)

router.get('/allBroadcasts',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('broadcasts_templates'),
  auth.isUserAllowedToPerformThisAction('view_templates'),
  controller.allBroadcasts)

router.post('/getAllBroadcasts',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('broadcasts_templates'),
  auth.isUserAllowedToPerformThisAction('view_templates'),
  controller.getAllBroadcasts) // pagination

router.post('/editBroadcast',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('broadcasts_templates'),
  auth.isUserAllowedToPerformThisAction('update_templates'),
  controller.editBroadcast)

router.delete('/deleteBroadcast/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('broadcasts_templates'),
  auth.isUserAllowedToPerformThisAction('delete_templates'),
  controller.deleteBroadcast)

router.get('/broadcastDetails/:broadcastid',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('broadcasts_templates'),
  auth.isUserAllowedToPerformThisAction('view_templates'),
  controller.broadcastDetails)

router.post('/createBot',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('smart_replies'),
  auth.isUserAllowedToPerformThisAction('create_bots'),
  validate({body: validationSchema.createBot}),
  controller.createBotTemplate)

router.get('/allBots',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('smart_replies'),
  auth.isUserAllowedToPerformThisAction('view_bots'),
  controller.allBots)

router.post('/editBot',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('smart_replies'),
  auth.isUserAllowedToPerformThisAction('update_bots'),
  validate({body: validationSchema.editBot}),
  controller.editBot)

router.delete('/deleteBot/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('smart_replies'),
  auth.isUserAllowedToPerformThisAction('delete_bots'),
  controller.deleteBot)

router.get('/botDetails/:botid',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('smart_replies'),
  auth.isUserAllowedToPerformThisAction('view_bots'),
  controller.botDetails)

// todo this is temporary template for DNC, this would be made data driven using above routes
router.get('/getPoliticsBotTemplate',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('smart_replies'),
  auth.isUserAllowedToPerformThisAction('view_bots'),
  controller.getPoliticsBotTemplate)

module.exports = router
