'use strict'

const express = require('express')

const router = express.Router()
const validate = require('express-jsonschema').validate
const controller = require('./rssFeeds.controller')
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')

router.post('/create',
  auth.isAuthenticated(),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/fetchFeeds',
  auth.isAuthenticated(),
  validate({body: validationSchema.fetchPayload}),
  controller.fetchFeeds)

router.delete('/:id',
  auth.isAuthenticated(),
  controller.delete)
  
router.post('/rssFeedPosts',
  auth.isAuthenticated(),
  validate({body: validationSchema.getRssFeedPostsPayload}),
  controller.getRssFeedPosts)
  
router.post('/edit',
  auth.isAuthenticated(),
  validate({body: validationSchema.editPayload}),
  controller.edit)

module.exports = router
