'use strict'

const express = require('express')
const router = express.Router()
const seenController = require('./seen.controller')
const deliveryController = require('./delivery.controller')
const pollController = require('./pollResponse.controller')
const surveyController = require('./surveyResponse.controller')
const messagingReferrals = require('./messagingReferrals.controller')
const landingPage = require('./landingPage.controller')
const sequenceController = require('./sequence.controller')
const auth = require('../../../auth/auth.service')

router.post('/seen', auth.isItWebhookServer(), seenController.index)
router.post('/delivery', auth.isItWebhookServer(), deliveryController.index)
router.post('/pollResponse', auth.isItWebhookServer(), pollController.pollResponse)
router.post('/surveyResponse', auth.isItWebhookServer(), surveyController.surveyResponse)
router.post('/messagingReferrals', auth.isItWebhookServer(), messagingReferrals.index)
router.post('/landingPage', auth.isItWebhookServer(), landingPage.index)
router.post('/sequence', auth.isItWebhookServer(), sequenceController.index)

module.exports = router
