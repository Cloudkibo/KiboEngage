const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')
const controller = require('./customer.controller')
const multiparty = require('connect-multiparty')
const multipartyMiddleware = multiparty()

router.post('/uploadCSV',
  auth.isAuthenticated(),
  multipartyMiddleware,
  // validate({body: validationSchema.uploadCSV}),
  controller.uploadCSV)

module.exports = router
