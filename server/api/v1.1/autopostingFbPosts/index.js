'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./autopostingFbPosts.controller')
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')
const validate = require('express-jsonschema').validate

router.post('/:id',
  auth.isAuthenticated(),
  validate({body: validationSchema.getPostsPayload}),
  controller.getPosts)

module.exports = router
