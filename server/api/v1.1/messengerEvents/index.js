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
const profilePicController = require('./profilePic.controller')
const policyController = require('./policy.controller')
const menuController = require('./menu.controller')
const welcomeMessageController = require('./welcomeMessage.controller')
const messengerAdsController = require('./messengerAds.controller')
const shopifyController = require('./shopify.controller')
const templatesController = require('./templates.controller')
const tagsController = require('./tags.controller')
const customFieldsController = require('./customFields.controller')
const flowBuilder = require('./flowBuilder.controller')
const googleSheetsController = require('./googleSheets.controller')
const hubspotController = require('./hubspot.controller')
const userInputController = require('./userInput.controller')
const rssFeedsController = require('./rssFeeds.controller')

router.post('/seen', auth.isItWebhookServer(), seenController.index)
router.post('/delivery', auth.isItWebhookServer(), deliveryController.index)
router.post('/pollResponse', auth.isItWebhookServer(), pollController.pollResponse)
router.post('/surveyResponse', auth.isItWebhookServer(), surveyController.surveyResponse)
router.post('/messagingReferrals', auth.isItWebhookServer(), messagingReferrals.index)
router.post('/landingPage', auth.isItWebhookServer(), landingPage.index)
router.post('/sequence', auth.isItWebhookServer(), sequenceController.index)
router.post('/sendSequenceMessage', auth.isItWebhookServer(), sequenceController.sendSequenceMessage)
router.post('/subscribeToSequence', auth.isItWebhookServer(), sequenceController.subscribeToSequence)
router.post('/unsubscribeFromSequence', auth.isItWebhookServer(), sequenceController.unsubscribeFromSequence)
router.post('/sequence/subscriberJoins', auth.isItWebhookServer(), sequenceController.subscriberJoins)
router.post('/updateProfilePic', auth.isItWebhookServer(), profilePicController.updateProfilePic)
router.post('/policyNotification', auth.isItWebhookServer(), policyController.policyNotification)
router.post('/menuReply', auth.isItWebhookServer(), menuController.index)
router.post('/welcomeMessage', auth.isItWebhookServer(), welcomeMessageController.index)
router.post('/messengerAdsReply', auth.isItWebhookServer(), messengerAdsController.index)
router.post('/shopify', auth.isItWebhookServer(), shopifyController.shopify)
router.post('/shopifyNewSubscriber', auth.isItWebhookServer(), shopifyController.shopifyNewSubscriber)
router.post('/sendTemplateMessage', auth.isItWebhookServer(), templatesController.index)
router.post('/assignTag', auth.isItWebhookServer(), tagsController.assignTag)
router.post('/unAssignTag', auth.isItWebhookServer(), tagsController.unAssignTag)
router.post('/setCustomField', auth.isItWebhookServer(), customFieldsController.index)
router.post('/sendMessageBlock', auth.isItWebhookServer(), flowBuilder.index)
router.post('/googleSheets', auth.isItWebhookServer(), googleSheetsController.index)
router.post('/hubspot', auth.isItWebhookServer(), hubspotController.index)
router.post('/userInput', auth.isItWebhookServer(), userInputController.index)
router.post('/rssFeeds/changeSubscription', auth.isItWebhookServer(), rssFeedsController.changeSubscription)
router.post('/rssFeeds/showMoreTopics', auth.isItWebhookServer(), rssFeedsController.showMoreTopics)
router.post('/rssFeeds/sendTopicFeed', auth.isItWebhookServer(), rssFeedsController.sendTopicFeed)

module.exports = router
