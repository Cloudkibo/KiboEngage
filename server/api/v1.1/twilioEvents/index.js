const express = require('express')
const router = express.Router()

const whatsAppController = require('./whatsApp.controller')
const smsController = require('./sms.controller')

//  WhatsApp
router.post('/trackDeliveryWhatsApp/:id', whatsAppController.trackDeliveryWhatsApp)

//  sms
router.post('/trackDeliverySms/:id', smsController.trackDeliverySms)

module.exports = router
