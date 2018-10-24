

'use strict'

var express = require('express')
var controller = require('./ipcountry.controller')
var cors = require('cors')

var router = express.Router()

const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.post('/findIp',
  cors(),
  validate({body: validationSchema.findPayload}),
  controller.findIp)

module.exports = router
