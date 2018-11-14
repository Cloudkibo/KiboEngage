const express = require('express')

const router = express.Router()

const controller = require('./wordpress.controller')
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')
const validate = require('express-jsonschema').validate

//, auth.isItWebhookServer()
router.post('/wordpress', validate({body: validationSchema.wordpressPayload}), controller.postPublish)

module.exports = router
