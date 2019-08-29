/**
 * Created by sojharo on 24/11/2017.
 */
const express = require('express')

const router = express.Router()

const controller = require('./messageStatistics.controller')

router.get('/',
  controller.index)

module.exports = router
