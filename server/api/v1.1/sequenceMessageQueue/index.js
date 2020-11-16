'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./SequenceMessageQueue.controller')
const auth = require('../../../auth/auth.service')

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.index)

