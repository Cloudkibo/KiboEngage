const express = require('express')
const router = express.Router()
const controller = require('./controller')

router.get('/normalizeDataForDelivery', controller.normalizeDataForDelivery)

module.exports = router
