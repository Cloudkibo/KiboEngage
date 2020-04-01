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
  controller.allUserBroadcasts) // pagination

router.post('/allUserPolls/:userid',
  validate({body: validationSchema.getAllBroadcastsPayload}),
  auth.isAuthorizedSuperUser(),
  controller.allUserPolls) // pagination

router.post('/allUserSurveys/:userid',
  validate({body: validationSchema.getAllBroadcastsPayload}),
  auth.isAuthorizedSuperUser(),
  controller.allUserSurveys) // pagination

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

router.get('/alUserslLocales',
  auth.isAuthorizedSuperUser(),
  controller.alUserslLocales)

router.get('/sendEmail', auth.isAuthorizedSuperUser(), controller.sendEmail)

router.get('/uploadFile', auth.isAuthorizedSuperUser(), controller.uploadFile)

router.post('/fetchAutopostingDetails',
  auth.isAuthorizedSuperUser(),
  controller.fetchAutopostingDetails)

router.post('/fetchUniquePages',
  auth.isAuthorizedSuperUser(),
  controller.fetchUniquePages)

router.get('/getPagePermissions/:id',
  auth.isAuthorizedSuperUser(),
  controller.getPagePermissions)

router.post('/fetchPageUsers',
  validate({body: validationSchema.getPageUsersPayload}),
  auth.isAuthorizedSuperUser(),
  controller.fetchPageUsers)

router.get('/fetchPageTags/:pageId',
  auth.isAuthorizedSuperUser(),
  controller.fetchPageTags)

router.post('/fetchSubscribersWithTags',
  auth.isAuthorizedSuperUser(),
  controller.fetchSubscribersWithTagsNew)

router.get('/fetchPageAdmins/:pageId',
  auth.isAuthorizedSuperUser(),
  controller.fetchPageAdmins)

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
  controller.fetchPageOwners)

router.get('/integrationsData',
  auth.isAuthorizedSuperUser(),
  controller.integrationsData)

module.exports = router
