const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./lists.controller')

router.get('/allLists',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.allLists)

router.post('/getAll',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.getAllPayload}),
  controller.getAll)

router.post('/createList',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/editList',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.editPayload}),
  controller.editList)

router.get('/viewList/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.viewList)

router.delete('/deleteList/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.deleteList)

router.get('/repliedPollSubscribers',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.repliedPollSubscribers)

router.get('/repliedSurveySubscribers',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.repliedSurveySubscribers)

module.exports = router
