'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./surveys.controller')
const auth = require('../../../auth/auth.service')

router.post('/allSurveys',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('surveys'),
  auth.doesRolePermitsThisAction('surveyPermission'),
  controller.allSurveys)

router.post('/create',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('surveys'),
  auth.doesRolePermitsThisAction('surveyPermission'),
  controller.create)

router.post('/edit',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('surveys'),
  auth.doesRolePermitsThisAction('surveyPermission'),
  controller.edit)

router.post('/send',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('surveys'),
  auth.doesRolePermitsThisAction('surveyPermission'),
  controller.send)

router.post('/sendSurveyDirectly',
    auth.isAuthenticated(),
    auth.doesPlanPermitsThisAction('surveys'),
    auth.doesRolePermitsThisAction('surveyPermission'),
    controller.sendSurvey)

//  router.post('/submitresponse', controller.submitresponse)

router.get('/showquestions/:id',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('surveys'),
  auth.doesRolePermitsThisAction('surveyPermission'),
  controller.showQuestions)

router.get('/:id',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('surveys'),
  auth.doesRolePermitsThisAction('surveyPermission'),
  controller.show) // show survey and responses of the survey

router.delete('/deleteSurvey/:id',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('surveys'),
  auth.doesRolePermitsThisAction('surveyPermission'),
  controller.deleteSurvey) // show survey and responses of the survey

module.exports = router
