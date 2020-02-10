const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const controller = require('./sponsoredMessaging.controller')
const validationSchema = require('./validationSchema')

router.get('/',
  auth.isAuthenticated(),
  controller.index)

router.post('/',
  auth.isAuthenticated(),
  validate({ body: validationSchema.createPayload }),
  controller.create)

router.post('/update/:id',
  auth.isAuthenticated(),
  validate({ body: validationSchema.updatePayload }),
  controller.update
)

router.post('/send/:id',
  auth.isAuthenticated(),
  validate({ body: validationSchema.updatePayload }),
  controller.send
)

router.post('/sendInSandbox/:id',
  // auth.isAuthenticated(),
  validate({ body: validationSchema.updatePayload }),
  controller.sendInSandbox
)

router.delete('/:_id',
  auth.isAuthenticated(),
  controller.delete)

router.get('/insights/:ad_id',
  auth.isAuthenticated(),
  controller.getInsight
)

module.exports = router
