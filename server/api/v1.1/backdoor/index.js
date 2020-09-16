/**
 * Created by sojharo on 25/09/2017.
 */

'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./backdoor.controller')
const userController = require('./userData.controller')
const permissionsController = require('./permissionsData.controller')
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
  userController.getAllPages) // pagination

router.post('/getMessagesCount',
  auth.isAuthorizedSuperUser(),
  userController.getMessagesCount)

router.post('/getAllSubscribers/:pageid',
  validate({body: validationSchema.getAllSubscribersPayload}),
  auth.isAuthorizedSuperUser(),
  controller.getAllSubscribers) // pagination

router.get('/allsubscribers/:pageid',
  auth.isAuthorizedSuperUser(),
  controller.AllSubscribers)

router.post('/allUserBroadcasts/:userid',
  validate({body: validationSchema.allUserBroadcastsPayload}),
  auth.isAuthorizedSuperUser(),
  userController.allUserBroadcasts) // pagination

router.post('/allUserPolls/:userid',
  validate({body: validationSchema.getAllBroadcastsPayload}),
  auth.isAuthorizedSuperUser(),
  userController.allUserPolls) // pagination

router.post('/allUserSurveys/:userid',
  validate({body: validationSchema.getAllBroadcastsPayload}),
  auth.isAuthorizedSuperUser(),
  userController.allUserSurveys) // pagination

router.post('/userSummary',
  validate({body: validationSchema.getUserSummary}),
  auth.isAuthorizedSuperUser(),
  userController.getUserSummary)

router.get('/polls/:pollid', auth.isAuthorizedSuperUser(), controller.poll)

router.get('/surveyDetails/:surveyid', auth.isAuthorizedSuperUser(), controller.surveyDetails)

router.get('/broadcastsGraph/:days', auth.isAuthorizedSuperUser(), controller.broadcastsGraph)

router.get('/pollsGraph/:days', auth.isAuthorizedSuperUser(), controller.pollsGraph)

router.get('/surveysGraph/:days', auth.isAuthorizedSuperUser(), controller.surveysGraph)

router.get('/sessionsGraph/:days', auth.isAuthorizedSuperUser(), controller.sessionsGraph)

router.post('/getAllBroadcasts',
  validate({body: validationSchema.getAllBroadcastsPayload}),
  auth.isAuthorizedSuperUser(),
  controller.getAllBroadcasts) // pagination

router.post('/getAllSurveys',
  validate({body: validationSchema.getAllBroadcastsPayload}),
  auth.isAuthorizedSuperUser(),
  controller.getAllSurveys) // pagination

router.post('/getAllPolls',
  validate({body: validationSchema.getAllBroadcastsPayload}),
  auth.isAuthorizedSuperUser(),
  controller.getAllPolls) // pagination

router.get('/allLocales/:pageid',
  auth.isAuthorizedSuperUser(),
  controller.allLocales)

router.get('/sendEmail', auth.isAuthorizedSuperUser(), controller.weeklyEmail)

router.get('/uploadFile', auth.isAuthorizedSuperUser(), controller.uploadFile)

router.post('/fetchAutopostingDetails',
  auth.isAuthorizedSuperUser(),
  controller.fetchAutopostingDetails)

router.post('/fetchUniquePages',
  auth.isAuthorizedSuperUser(),
  controller.fetchUniquePages)

router.get('/getPagePermissions/:id',
  auth.isAuthorizedSuperUser(),
  permissionsController.getPagePermissions)

router.post('/fetchPageUsers',
  validate({body: validationSchema.getPageUsersPayload}),
  auth.isAuthorizedSuperUser(),
  permissionsController.fetchPageUsers)

router.get('/fetchPageTags/:pageId',
  auth.isAuthorizedSuperUser(),
  permissionsController.fetchPageTags)

router.post('/fetchSubscribersWithTags',
  auth.isAuthorizedSuperUser(),
  permissionsController.fetchSubscribersWithTagsNew)

router.get('/fetchPageAdmins/:pageId',
  auth.isAuthorizedSuperUser(),
  permissionsController.fetchPageAdmins)

router.post('/fetchCompanyInfo',
  auth.isAuthorizedSuperUser(),
  controller.fetchCompanyInfoNew)

router.post('/topPages',
  auth.isAuthorizedSuperUser(),
  controller.topPages)

router.post('/usersListForViewAs',
  auth.isAuthorizedSuperUser(),
  controller.usersListForViewAs
)

router.get('/fetchPageOwners/:pageId',
  auth.isAuthorizedSuperUser(),
  permissionsController.fetchPageOwners)

router.get('/integrationsData',
  auth.isAuthorizedSuperUser(),
  controller.integrationsData)

router.post('/pageAnalytics',
  auth.isAuthorizedSuperUser(),
  controller.pageAnalytics)

router.post('/otherAnalytics',
  auth.isAuthorizedSuperUser(),
  controller.otherAnalytics)

router.post('/getAllCommentCaptures',
  validate({body: validationSchema.commentCapturePayload}),
  auth.isAuthorizedSuperUser(),
  controller.getAllCommentCaptures)

router.post('/getAllChatBots',
  validate({body: validationSchema.commentCapturePayload}),
  auth.isAuthorizedSuperUser(),
  controller.getAllChatBots)

router.post('/metricsWhatsApp',
  auth.isAuthorizedSuperUser(),
  controller.metricsWhatsApp)

router.get('/sendWhatsAppMetricsEmail',
  auth.isAuthorizedSuperUser(),
  controller.sendWhatsAppMetricsEmail)

router.post('/actingAsUser',
  validate({body: validationSchema.actingAsUserPayload}),
  auth.isAuthorizedSuperUser(),
  controller.actingAsUser)

module.exports = router
