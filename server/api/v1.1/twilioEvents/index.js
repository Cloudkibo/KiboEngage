const express = require('express')
const router = express.Router()

const whatsAppController = require('./whatsApp.controller')

//  WhatsApp
router.post('/trackDeliveryWhatsApp/:id', whatsAppController.trackDeliveryWhatsApp)

module.exports = router
