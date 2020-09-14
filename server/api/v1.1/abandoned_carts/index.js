/**
 * Created by sojharo on 27/07/2017.
 */

'use strict'

const express = require('express')

const router = express.Router()
const validationSchema = require('./validationSchema')
const auth = require('../../../auth/auth.service')
const controller = require('./abandoned_carts.controller')
const validate = require('express-jsonschema').validate

router.get('/getStores',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.index) // this id will be userid

router.post('/updateStoreInfo/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.updateStoreSchema}),
  controller.updateStoreInfo)

router.get('/abandonedCheckouts',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.abandonedCheckouts) // this id will be userid

router.get('/getOrders',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.getOrders)

router.get('/getOrders/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.getOrder)

router.post('/saveStoreInfo',
  auth.isAuthenticated(),
  validate({body: validationSchema.storeInfoSchema}),
  auth.isSuperUserActingAsCustomer('write'),
  controller.saveStoreInfo)

router.post('/saveCartInfo',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.cartInfoSchema}),
  controller.saveCartInfo)

router.post('/saveCheckoutInfo',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.checkoutInfoSchema}),
  controller.saveCheckoutInfo)

router.post('/updateStatusStore',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.updateStatusStore)

router.post('/deleteAllCartInfo',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.deleteAllCartInfo)

router.post('/deleteOneCartInfo',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.deleteOneCartInfo)

router.post('/deleteCheckoutInfo',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.deleteCheckoutInfo)

router.get('/deleteAllInfo',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.deleteAllInfo)

router.post('/sendCheckout',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.sendCheckout)

router.get('/sendAnalytics',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.sendAnalytics)

module.exports = router
