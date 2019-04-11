const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const controller = require('./sponsoredMessaging.controller')
const validationSchema = require('./validationSchema')

router.post('/',
    auth.isAuthenticated(),
    validate({body: validationSchema.createPayload}),
    controller.create)


module.exports = router