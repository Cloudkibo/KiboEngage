const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./commentCapture.controller')

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('comment_capture'),
  auth.isUserAllowedToPerformThisAction('view_comment_capture_rules'),
  validate({body: validationSchema.getPostsPayload}),
  controller.index)

router.get('/fetchPostsAnalytics',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('comment_capture'),
  auth.isUserAllowedToPerformThisAction('view_comment_capture_rules'),
  controller.postsAnalytics)

router.post('/fetchAllComments',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('comment_capture'),
  auth.isUserAllowedToPerformThisAction('view_comment_capture_rules'),
  controller.fetchAllComments)

router.get('/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('comment_capture'),
  auth.isUserAllowedToPerformThisAction('view_comment_capture_rules'),
  controller.viewPost)

router.post('/create',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('comment_capture'),
  auth.isUserAllowedToPerformThisAction('create_comment_capture_rules'),
  controller.create)

router.post('/edit',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('comment_capture'),
  auth.isUserAllowedToPerformThisAction('update_comment_capture_rules'),
  validate({body: validationSchema.postUpdatePayload}),
  controller.edit)

router.delete('/delete/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('comment_capture'),
  auth.isUserAllowedToPerformThisAction('delete_comment_capture_rules'),
  controller.delete)

router.post('/getComments',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('comment_capture'),
  auth.isUserAllowedToPerformThisAction('view_comment_capture_rules'),
  validate({body: validationSchema.getCommentsPayload}),
  controller.getComments)

router.post('/getRepliesToComment',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('comment_capture'),
  auth.isUserAllowedToPerformThisAction('view_comment_capture_rules'),
  validate({body: validationSchema.getRepliesToCommentPayload}),
  controller.getRepliesToComment)

router.get('/fetchPostData/:_id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('comment_capture'),
  auth.isUserAllowedToPerformThisAction('view_comment_capture_rules'),
  controller.fetchPostData)

router.post('/fetchGlobalPostData',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('comment_capture'),
  auth.isUserAllowedToPerformThisAction('view_comment_capture_rules'),
  validate({body: validationSchema.fetchGlobalPostDataPayload}),
  controller.fetchGlobalPostData)

router.post('/filterComments',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('comment_capture'),
  auth.isUserAllowedToPerformThisAction('view_comment_capture_rules'),
  validate({body: validationSchema.filterCommentsPayload}),
  controller.filterComments)

module.exports = router
