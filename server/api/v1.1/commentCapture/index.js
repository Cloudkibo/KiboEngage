const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./commentCapture.controller')

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.getPostsPayload}),
  controller.index)

router.get('/fetchPostsAnalytics',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.postsAnalytics)

router.post('/fetchAllComments',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchAllComments)

router.get('/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.viewPost)

router.post('/create',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.create)

router.post('/edit',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.postUpdatePayload}),
  controller.edit)

router.delete('/delete/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.delete)

router.post('/getComments',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.getCommentsPayload}),
  controller.getComments)

router.post('/getRepliesToComment',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.getRepliesToCommentPayload}),
  controller.getRepliesToComment)

router.get('/fetchPostData/:_id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchPostData)

router.post('/fetchGlobalPostData',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.fetchGlobalPostDataPayload}),
  controller.fetchGlobalPostData)

router.post('/filterComments',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.filterCommentsPayload}),
  controller.filterComments)

module.exports = router
