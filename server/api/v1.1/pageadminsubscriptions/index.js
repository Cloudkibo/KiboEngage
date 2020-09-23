'use strict'

var express = require('express')
var controller = require('./pageadminsubscriptions.controller')
var auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')
const validate = require('express-jsonschema').validate

var router = express.Router()

router.get('/', auth.isAuthenticated(), 
auth.isSuperUserActingAsCustomer(),
controller.index)
router.post('/',
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.createPayload}),
  controller.create)
router.post('/fetch', auth.isAuthenticated(), auth.isSuperUserActingAsCustomer(), controller.fetch)
// router.post('/updatecompanyprofile', auth.isAuthenticated(), controller.updatecompanyprofile)
// router.get('/:id', auth.isAuthenticated(), controller.show)
// router.post('/', auth.isAuthenticated(), controller.create)
// router.put('/:id', auth.isAuthenticated(), controller.update)
// router.patch('/:id', controller.update)
// router.delete('/:id', controller.destroy)

module.exports = router
