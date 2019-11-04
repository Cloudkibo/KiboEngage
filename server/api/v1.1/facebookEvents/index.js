'use strict'

const express = require('express')
const router = express.Router()
const autopostingController = require('./autoposting.controller')
const commentController = require('./comment.controller')
const likesController = require('./likes.controller')
const postController = require('./post.controller')
const changePageNameController = require('./changePageName.controller')
const auth = require('../../../auth/auth.service')

router.post('/autoposting', auth.isItWebhookServer(), autopostingController.autoposting)
router.post('/comment', auth.isItWebhookServer(), commentController.sendCommentReply)
router.post('/changePageName', auth.isItWebhookServer(), changePageNameController.changePageName)
router.post('/likes', auth.isItWebhookServer(), likesController.handleLikeEvent)
router.post('/post', auth.isItWebhookServer(), postController.handlePostEvent)
router.post('/sendSecondReplyToComment', auth.isItWebhookServer(), commentController.sendSecondReplyToComment)

module.exports = router
