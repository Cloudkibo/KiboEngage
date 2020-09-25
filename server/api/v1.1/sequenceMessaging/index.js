'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./sequence.controller')
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')
const validate = require('express-jsonschema').validate

router.get('/allMessages/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('sequence_messaging'),
  auth.isUserAllowedToPerformThisAction('view_sequences'),
  controller.allMessages)

router.get('/subscriberSequences/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('sequence_messaging'),
  auth.isUserAllowedToPerformThisAction('view_sequences'),
  controller.subscriberSequences)

router.get('/allSequences',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('sequence_messaging'),
  auth.isUserAllowedToPerformThisAction('view_sequences'),
  controller.allSequences)

router.delete('/deleteSequence/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('sequence_messaging'),
  auth.isUserAllowedToPerformThisAction('delete_sequences'),
  controller.deleteSequence)

router.delete('/deleteMessage/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('sequence_messaging'),
  auth.isUserAllowedToPerformThisAction('update_sequences'),
  controller.deleteMessage)

router.post('/createMessage',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('sequence_messaging'),
  auth.isUserAllowedToPerformThisAction('update_sequences'),
  validate({body: validationSchema.createMessagePayload}),
  controller.createMessage)

router.post('/editMessage',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('sequence_messaging'),
  auth.isUserAllowedToPerformThisAction('update_sequences'),
  validate({body: validationSchema.editMessagePayload}),
  controller.editMessage)

router.post('/setSchedule',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('sequence_messaging'),
  auth.isUserAllowedToPerformThisAction('update_sequences'),
  validate({body: validationSchema.setSchedulePayload}),
  controller.setSchedule)

router.post('/createSequence',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('sequence_messaging'),
  auth.isUserAllowedToPerformThisAction('create_sequences'),
  validate({body: validationSchema.createSequencePayload}),
  controller.createSequence)

router.post('/editSequence',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('sequence_messaging'),
  auth.isUserAllowedToPerformThisAction('update_sequences'),
  validate({body: validationSchema.editSequencePayload}),
  controller.editSequence)

router.post('/getAll',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('sequence_messaging'),
  auth.isUserAllowedToPerformThisAction('view_sequences'),
  validate({body: validationSchema.getAllPayload}),
  controller.getAll) // pagination

router.post('/subscribeToSequence',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('sequence_messaging'),
  auth.isUserAllowedToPerformThisAction('view_sequences'),
  validate({body: validationSchema.subscribeToSequencePayload}),
  controller.subscribeToSequence)

router.post('/unsubscribeToSequence',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('sequence_messaging'),
  auth.isUserAllowedToPerformThisAction('view_sequences'),
  validate({body: validationSchema.unsubscribeToSequencePayload}),
  controller.unsubscribeToSequence)

router.post('/testScheduler',
  validate({body: validationSchema.testSchedulerPayload}),
  controller.testScheduler)

router.post('/updateTrigger',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('sequence_messaging'),
  auth.isUserAllowedToPerformThisAction('update_sequences'),
  validate({body: validationSchema.updateTriggerPayload}),
  controller.updateTrigger)

router.post('/updateSegmentation',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('sequence_messaging'),
  auth.isUserAllowedToPerformThisAction('update_sequences'),
  validate({body: validationSchema.updateSegmentationPayload}),
  controller.updateSegmentation)

module.exports = router
