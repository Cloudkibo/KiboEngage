'use strict'

const express = require('express')

const router = express.Router()
const validate = require('express-jsonschema').validate
const controller = require('./newsSections.controller')
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')
const { checkSMP } = require('../../middleware/SMPStatus.middleware')

router.get('/checkSMP',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  checkSMP(),
  controller.checkSMP)

router.post('/create',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/fetchFeeds',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.fetchPayload}),
  controller.fetchFeeds)

router.delete('/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.delete)

router.post('/rssFeedPosts',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.getRssFeedPostsPayload}),
  controller.getRssFeedPosts)

router.post('/edit',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.editPayload}),
  controller.edit)

router.post('/preview',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.previewPayload}),
  controller.preview)

module.exports = router
