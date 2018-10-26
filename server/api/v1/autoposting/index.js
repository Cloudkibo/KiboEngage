'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./autoposting.controller')
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')
const validate = require('express-jsonschema').validate

router.get('/',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('autoposting'),
  auth.doesRolePermitsThisAction('autopostingPermission'),
  controller.index)

router.post('/create',
  auth.isAuthenticated(),
  // auth.doesPlanPermitsThisAction('autoposting'),
  // auth.doesRolePermitsThisAction('autopostingPermission'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/edit',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('autoposting'),
  auth.doesRolePermitsThisAction('autopostingPermission'),
  validate({body: validationSchema.editPayload}),
  controller.edit)

router.delete('/:id',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('autoposting'),
  auth.doesRolePermitsThisAction('autopostingPermission'),
  controller.destroy)

module.exports = router
