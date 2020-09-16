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
  auth.doesPlanPermitsThisAction('news_integration'),
  auth.isUserAllowedToPerformThisAction('view_news_fedds'),
  checkSMP(),
  controller.checkSMP)

router.post('/create',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('news_integration'),
  auth.isUserAllowedToPerformThisAction('add_news_feeds'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/fetchFeeds',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('news_integration'),
  auth.isUserAllowedToPerformThisAction('view_news_fedds'),
  validate({body: validationSchema.fetchPayload}),
  controller.fetchFeeds)

router.delete('/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('news_integration'),
  auth.isUserAllowedToPerformThisAction('delete_news_feeds'),
  controller.delete)

router.post('/rssFeedPosts',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('news_integration'),
  auth.isUserAllowedToPerformThisAction('view_news_fedds'),
  validate({body: validationSchema.getRssFeedPostsPayload}),
  controller.getRssFeedPosts)

router.post('/edit',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('news_integration'),
  auth.isUserAllowedToPerformThisAction('update_news_feeds'),
  validate({body: validationSchema.editPayload}),
  controller.edit)

router.post('/preview',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('news_integration'),
  auth.isUserAllowedToPerformThisAction('view_news_fedds'),
  validate({body: validationSchema.previewPayload}),
  controller.preview)

module.exports = router
