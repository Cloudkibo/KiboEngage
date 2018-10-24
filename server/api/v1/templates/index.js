'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./templates.controller')
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')


router.get('/allPolls', auth.isAuthenticated(), controller.allPolls)
router.post('/getAllPolls', auth.isAuthenticated(), validate({body: validationSchema.getAllPolls}), controller.getAllPolls) // pagination
router.post('/createPoll', auth.isAuthorizedSuperUser(), validate({body: validationSchema.createPoll}), controller.createPoll)
router.post('/createSurvey', auth.isAuthorizedSuperUser(), validate({body: validationSchema.createSurvey}),controller.createSurvey)
router.get('/allSurveys', auth.isAuthenticated(), controller.allSurveys)
router.post('/getAllSurveys', auth.isAuthenticated(), validate({body: validationSchema.getAllSurveys}), controller.getAllSurveys) // pagination
router.post('/createCategory', auth.isAuthenticated(), validate({body: validationSchema.createCategory}), controller.createCategory)
router.get('/allCategories', auth.isAuthenticated(), controller.allCategories)
router.get('/surveyDetails/:surveyid', auth.isAuthenticated(), controller.surveyDetails)
router.get('/pollDetails/:pollid', auth.isAuthenticated(), controller.pollDetails)
router.delete('/deletePoll/:id', auth.isAuthorizedSuperUser(),  controller.deletePoll)
router.delete('/deleteSurvey/:id', auth.isAuthorizedSuperUser(), controller.deleteSurvey)
router.delete('/deleteCategory/:id', auth.isAuthenticated(), controller.deleteCategory)
router.post('/editCategory', auth.isAuthenticated(),validate({body: validationSchema.editCategory}), controller.editCategory)
router.post('/editPoll', auth.isAuthorizedSuperUser(),validate({body: validationSchema.editPoll}), controller.editPoll)
router.post('/editSurvey', auth.isAuthorizedSuperUser(),validate({body: validationSchema.editSurvey}), controller.editSurvey)

router.post('/createBroadcast', auth.isAuthenticated(), validate({body: validationSchema.createBroadcast}), controller.createBroadcast)
router.get('/allBroadcasts', auth.isAuthenticated(), controller.allBroadcasts)
router.post('/getAllBroadcasts', auth.isAuthenticated(), validate({body: validationSchema.getAllBroadcasts}), controller.getAllBroadcasts) // pagination
router.post('/editBroadcast', auth.isAuthenticated(),validate({body: validationSchema.editBroadcast}), controller.editBroadcast)
router.delete('/deleteBroadcast/:id', auth.isAuthenticated(), controller.deleteBroadcast)
router.get('/broadcastDetails/:broadcastid', auth.isAuthenticated(), controller.broadcastDetails)

router.post('/createBot', auth.isAuthenticated(),validate({body: validationSchema.createBot}), controller.createBotTemplate)
router.get('/allBots', auth.isAuthenticated(), controller.allBots)
router.post('/editBot', auth.isAuthenticated(),validate({body: validationSchema.editBot}), controller.editBot)
router.delete('/deleteBot/:id', auth.isAuthenticated(), controller.deleteBot)
router.get('/botDetails/:botid', auth.isAuthenticated(), controller.botDetails)

// todo this is temporary template for DNC, this would be made data driven using above routes
router.get('/getPoliticsBotTemplate', auth.isAuthenticated(), controller.getPoliticsBotTemplate)

module.exports = router
