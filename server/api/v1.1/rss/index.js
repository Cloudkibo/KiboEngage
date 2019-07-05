'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./controller')

router.post('/', controller.fetchRssFeed)

module.exports = router
