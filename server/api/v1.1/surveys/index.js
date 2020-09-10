'use strict'

const express = require('express')

const router = express.Router()
const validate = require('express-jsonschema').validate

const controller = require('./surveys.controller')
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')

router.post('/allSurveys',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('surveys'),
  auth.isUserAllowedToPerformThisAction('view_surveys'),
  validate({body: validationSchema.createPayload}),
  controller.allSurveys)

router.post('/create',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('surveys'),
  auth.isUserAllowedToPerformThisAction('create_surveys'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/edit',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('surveys'),
  auth.isUserAllowedToPerformThisAction('create_surveys'),
  validate({body: validationSchema.createPayload}),
  controller.edit)

router.post('/send',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('surveys'),
  auth.isUserAllowedToPerformThisAction('resend_surveys'),
  validate({body: validationSchema.createPayload}),
  controller.send)

router.post('/sendSurveyDirectly',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('surveys'),
  auth.isUserAllowedToPerformThisAction('create_surveys'),
  controller.sendSurveyDirectly)

//  router.post('/submitresponse', controller.submitresponse)

router.get('/showquestions/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('surveys_reports'),
  auth.isUserAllowedToPerformThisAction('view_survey_reports'),
  controller.showQuestions)

router.get('/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('surveys_reports'),
  auth.isUserAllowedToPerformThisAction('view_survey_reports'),
  controller.show) // show survey and responses of the survey

router.delete('/deleteSurvey/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('surveys'),
  auth.isUserAllowedToPerformThisAction('delete_surveys'),
  controller.deleteSurvey)

module.exports = router
