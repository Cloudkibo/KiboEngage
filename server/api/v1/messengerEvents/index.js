'use strict'

const express = require('express')
const router = express.Router()
const seenController = require('./seen.controller')
const pollController = require('./pollResponse.controller')
const surveyController = require('./surveyResponse.controller')
const auth = require('../../../auth/auth.service')

router.post('/seen', auth.isItWebhookServer(), seenController.index)
router.post('/pollResponse', auth.isItWebhookServer(), pollController.pollResponse)
router.post('/surveyResponse', auth.isItWebhookServer(), surveyController.surveyResponse)

module.exports = router
