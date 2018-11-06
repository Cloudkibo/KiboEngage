'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./templates.controller')
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')
const validate = require('express-jsonschema').validate

router.get('/allPolls', auth.isAuthenticated(), controller.allPolls)
router.post('/getAllPolls', auth.isAuthenticated(), controller.getAllPolls) // pagination
router.post('/createPoll', auth.isAuthorizedSuperUser(), controller.createPoll)
router.post('/createSurvey', auth.isAuthorizedSuperUser(),controller.createSurvey)
router.get('/allSurveys', auth.isAuthenticated(), controller.allSurveys)
router.post('/getAllSurveys', auth.isAuthenticated(), controller.getAllSurveys) // pagination
router.post('/createCategory', auth.isAuthenticated(), controller.createCategory)
router.get('/allCategories', auth.isAuthenticated(), controller.allCategories)
router.get('/surveyDetails/:surveyid', auth.isAuthenticated(), controller.surveyDetails)
router.get('/pollDetails/:pollid', auth.isAuthenticated(), controller.pollDetails)
router.delete('/deletePoll/:id', auth.isAuthenticated(),  controller.deletePoll)
router.delete('/deleteSurvey/:id', auth.isAuthenticated(), controller.deleteSurvey)
router.delete('/deleteCategory/:id', auth.isAuthenticated(), controller.deleteCategory)
router.post('/editCategory', auth.isAuthenticated(),validate({body: validationSchema.editCategory}), controller.editCategory)
router.post('/editPoll', auth.isAuthenticated(), controller.editPoll)
router.post('/editSurvey',auth.isAuthorizedSuperUser(), controller.editSurvey)

router.post('/createBroadcast', auth.isAuthenticated(), controller.createBroadcast)
router.get('/allBroadcasts', auth.isAuthenticated(), controller.allBroadcasts)
router.post('/getAllBroadcasts', auth.isAuthenticated(), controller.getAllBroadcasts) // pagination
router.post('/editBroadcast', auth.isAuthenticated(), controller.editBroadcast)
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
