'use strict'

const express = require('express')
const router = express.Router()
const autopostingController = require('./autoposting.controller')
const commentController = require('./comment.controller')
const changePageNameController = require('./changePageName.controller')
const auth = require('../../../auth/auth.service')

router.post('/autoposting', auth.isItWebhookServer(), autopostingController.autoposting)
router.post('/comment', auth.isItWebhookServer(), commentController.sendCommentReply)
router.post('/changePageName', auth.isItWebhookServer(), changePageNameController.changePageName)

module.exports = router
