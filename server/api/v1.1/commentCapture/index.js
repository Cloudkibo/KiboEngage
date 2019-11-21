const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./commentCapture.controller')

router.get('/',
  auth.isAuthenticated(),
  controller.index)

router.get('/fetchPostsAnalytics',
  auth.isAuthenticated(),
  controller.postsAnalytics)

router.get('/:id',
  auth.isAuthenticated(),
  controller.viewPost)

router.post('/create',
  auth.isAuthenticated(),
  controller.create)

router.post('/edit',
  auth.isAuthenticated(),
  validate({body: validationSchema.postUpdatePayload}),
  controller.edit)

router.delete('/delete/:id',
  auth.isAuthenticated(),
  controller.delete)

router.post('/getComments',
  auth.isAuthenticated(),
  validate({body: validationSchema.getCommentsPayload}),
  controller.getComments)

router.post('/getRepliesToComment',
  auth.isAuthenticated(),
  validate({body: validationSchema.getRepliesToCommentPayload}),
  controller.getRepliesToComment)

module.exports = router
