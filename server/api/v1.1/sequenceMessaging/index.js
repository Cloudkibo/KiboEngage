'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./sequence.controller')
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')
const validate = require('express-jsonschema').validate

router.get('/allMessages/:id',
  auth.isAuthenticated(),
  controller.allMessages)

router.get('/subscriberSequences/:id',
  auth.isAuthenticated(),
  controller.subscriberSequences)

router.get('/allSequences',
  auth.isAuthenticated(),
  controller.allSequences)

router.delete('/deleteSequence/:id',
  auth.isAuthenticated(),
  controller.deleteSequence)

router.delete('/deleteMessage/:id',
  auth.isAuthenticated(),
  controller.deleteMessage)

router.post('/createMessage',
  auth.isAuthenticated(),
  validate({body: validationSchema.createMessagePayload}),
  controller.createMessage)

router.post('/editMessage',
  auth.isAuthenticated(),
  validate({body: validationSchema.editMessagePayload}),
  controller.editMessage)

router.post('/setSchedule',
  auth.isAuthenticated(),
  validate({body: validationSchema.setSchedulePayload}),
  controller.setSchedule)

router.post('/createSequence',
  auth.isAuthenticated(),
  validate({body: validationSchema.createSequencePayload}),
  controller.createSequence)

router.post('/editSequence',
  auth.isAuthenticated(),
  validate({body: validationSchema.editSequencePayload}),
  controller.editSequence)

router.post('/getAll',
  auth.isAuthenticated(),
  validate({body: validationSchema.getAllPayload}),
  controller.getAll) // pagination

router.post('/subscribeToSequence',
  auth.isAuthenticated(),
  validate({body: validationSchema.subscribeToSequencePayload}),
  controller.subscribeToSequence)

router.post('/unsubscribeToSequence',
  auth.isAuthenticated(),
  validate({body: validationSchema.unsubscribeToSequencePayload}),
  controller.unsubscribeToSequence)

router.post('/testScheduler',
  validate({body: validationSchema.testSchedulerPayload}),
  controller.testScheduler)

router.post('/updateTrigger',
  auth.isAuthenticated(),
  validate({body: validationSchema.updateTriggerPayload}),
  controller.updateTrigger)

router.post('/updateSegmentation',
  auth.isAuthenticated(),
  validate({body: validationSchema.updateSegmentationPayload}),
  controller.updateSegmentation)

module.exports = router
