'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./URL.controller')

router.get('/:id', controller.index)
router.get('/broadcast/:id', controller.broadcast)
router.get('/sequence/:id', controller.sequence)

module.exports = router
