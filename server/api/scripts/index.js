const express = require('express')
const router = express.Router()
const controller = require('./controller')

router.post('/normalizeDataForDelivery', controller.normalizeDataForDelivery)

module.exports = router
