/**
 * Created by sojharo on 25/09/2017.
 */

'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./backdoor.controller')
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')
const validate = require('express-jsonschema').validate

router.post('/getAllUsers',
  validate({body: validationSchema.getAllUsersPayload}),
  auth.isAuthorizedSuperUser(),
  controller.getAllUsers) // pagination

router.post('/getAllPages/:userid',
  validate({body: validationSchema.getAllPagesPayload}),
  auth.isAuthorizedSuperUser(),
  controller.getAllPages) // pagination
// router.post('/getAllSubscribers/:pageid', auth.isAuthorizedSuperUser(), controller.getAllSubscribers) // pagination
// router.post('/allUserBroadcasts/:userid', auth.isAuthorizedSuperUser(), controller.allUserBroadcasts) // pagination
// router.post('/allUserPolls/:userid', auth.isAuthorizedSuperUser(), controller.allUserPolls) // pagination
// router.post('/allUserSurveys/:userid', auth.isAuthorizedSuperUser(), controller.allUserSurveys) // pagination
// router.get('/toppages', auth.isAuthorizedSuperUser(), controller.toppages)
// router.get('/datacount/:userid', auth.isAuthorizedSuperUser(), controller.datacount)
// router.get('/uploadFile', auth.isAuthorizedSuperUser(), controller.uploadFile)
// router.get('/polls/:pollid', auth.isAuthorizedSuperUser(), controller.poll)
// router.get('/surveyDetails/:surveyid', auth.isAuthorizedSuperUser(), controller.surveyDetails)
// router.get('/broadcastsGraph/:days', auth.isAuthorizedSuperUser(), controller.broadcastsGraph)
// router.get('/pollsGraph/:days', auth.isAuthorizedSuperUser(), controller.pollsGraph)
// router.get('/surveysGraph/:days', auth.isAuthorizedSuperUser(), controller.surveysGraph)
// router.get('/sessionsGraph/:days', auth.isAuthorizedSuperUser(), controller.sessionsGraph)
// router.get('/broadcastsByDays/:days', auth.isAuthorizedSuperUser(), controller.broadcastsByDays)
// router.post('/getAllBroadcasts', auth.isAuthorizedSuperUser(), controller.getAllBroadcasts) // pagination
// router.get('/surveysByDays/:days', auth.isAuthorizedSuperUser(), controller.surveysByDays)
// router.post('/getAllSurveys', auth.isAuthorizedSuperUser(), controller.getAllSurveys) // pagination
// router.get('/pollsByDays/:days', auth.isAuthorizedSuperUser(), controller.pollsByDays)
// router.post('/getAllPolls', auth.isAuthorizedSuperUser(), controller.getAllPolls) // pagination
// router.get('/sendEmail', auth.isAuthorizedSuperUser(), controller.sendEmail)
router.get('/allLocales',
  auth.isAuthorizedSuperUser(),
  controller.allLocales)
// router.get('/deleteAccount/:id', auth.isAuthorizedSuperUser(), controller.deleteAccount)
// router.get('/deleteSubscribers/:id', auth.isAuthorizedSuperUser(), controller.deleteSubscribers)
// router.get('/deleteLiveChat/:id', auth.isAuthorizedSuperUser(), controller.deleteLiveChat)

module.exports = router
