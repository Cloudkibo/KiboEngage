'use strict'

let express = require('express')
let controller = require('./passwordresettoken.controller')
let auth = require('../../../auth/auth.service')

let router = express.Router()

router.post('/change', auth.isAuthenticated(), controller.change)
router.post('/forgot', controller.forgot)
router.post('/forgotWorkspaceName', controller.forgotWorkspaceName)
router.post('/reset', controller.reset)
router.get('/verify/:id', controller.verify)

module.exports = router
