'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./templates.controller')
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')
const validate = require('express-jsonschema').validate

router.get('/allPolls', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer(), controller.allPolls)
router.post('/getAllPolls', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer(), controller.getAllPolls) // pagination
router.post('/createPoll', auth.isAuthorizedSuperUser(), auth.isSuperUserActingAsCustomer('write'), controller.createPoll)
router.post('/createSurvey', auth.isAuthorizedSuperUser(), auth.isSuperUserActingAsCustomer('write'), controller.createSurvey)
router.get('/allSurveys', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer(), controller.allSurveys)
router.post('/getAllSurveys', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer(), controller.getAllSurveys) // pagination
router.post('/createCategory', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer('write'), controller.createCategory)
router.get('/allCategories', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer(), controller.allCategories)
router.get('/surveyDetails/:surveyid', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer(),  controller.surveyDetails)
router.get('/pollDetails/:pollid', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer(), controller.pollDetails)
router.delete('/deletePoll/:id', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer('write'), controller.deletePoll)
router.delete('/deleteSurvey/:id', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer('write'), controller.deleteSurvey)
router.delete('/deleteCategory/:id', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer('write'), controller.deleteCategory)
router.post('/editCategory', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer('write'), validate({body: validationSchema.editCategory}), controller.editCategory)
router.post('/editPoll', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer('write'), controller.editPoll)
router.post('/editSurvey', auth.isAuthorizedSuperUser(), auth.isSuperUserActingAsCustomer('write'), controller.editSurvey)

router.post('/createBroadcast', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer('write'), controller.createBroadcast)
router.get('/allBroadcasts', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer(),  controller.allBroadcasts)
router.post('/getAllBroadcasts', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer(),  controller.getAllBroadcasts) // pagination
router.post('/editBroadcast', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer('write'), controller.editBroadcast)
router.delete('/deleteBroadcast/:id', auth.isAuthenticated(),auth.isSuperUserActingAsCustomer('write'), controller.deleteBroadcast)
router.get('/broadcastDetails/:broadcastid', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer(),  controller.broadcastDetails)

router.post('/createBot', auth.isAuthenticated(),auth.isSuperUserActingAsCustomer('write'), validate({body: validationSchema.createBot}), controller.createBotTemplate)
router.get('/allBots', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer(),  controller.allBots)
router.post('/editBot', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer('write'), validate({body: validationSchema.editBot}), controller.editBot)
router.delete('/deleteBot/:id', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer('write'), controller.deleteBot)
router.get('/botDetails/:botid', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer(),  controller.botDetails)

// todo this is temporary template for DNC, this would be made data driven using above routes
router.get('/getPoliticsBotTemplate', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer(), controller.getPoliticsBotTemplate)

module.exports = router
