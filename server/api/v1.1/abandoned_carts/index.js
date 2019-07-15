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
  controller.index) // this id will be userid

router.get('/abandonedCheckouts',
  auth.isAuthenticated(),
  controller.abandonedCheckouts) // this id will be userid

router.get('/getOrders',
  auth.isAuthenticated(),
  controller.getOrders)

router.get('/getOrders/:id',
  auth.isAuthenticated(),
  controller.getOrder)

router.post('/saveStoreInfo',
  auth.isAuthenticated(),
  validate({body: validationSchema.storeInfoSchema}),
  controller.saveStoreInfo)

router.post('/saveCartInfo',
  auth.isAuthenticated(),
  validate({body: validationSchema.cartInfoSchema}),
  controller.saveCartInfo)

router.post('/saveCheckoutInfo',
  auth.isAuthenticated(),
  validate({body: validationSchema.checkoutInfoSchema}),
  controller.saveCheckoutInfo)

router.post('/updateStatusStore',
  auth.isAuthenticated(),
  controller.updateStatusStore)

router.post('updateStoreInfo/:id',
  auth.isAuthenticated(),
  validate({body: validationSchema.updateStoreSchema}),
  controller.updateStoreInfo)

router.post('/deleteAllCartInfo',
  auth.isAuthenticated(),
  controller.deleteAllCartInfo)

router.post('/deleteOneCartInfo',
  auth.isAuthenticated(),
  controller.deleteOneCartInfo)

router.post('/deleteCheckoutInfo',
  auth.isAuthenticated(),
  controller.deleteCheckoutInfo)

router.get('/deleteAllInfo',
  auth.isAuthenticated(),
  controller.deleteAllInfo)

router.post('/sendCheckout',
  auth.isAuthenticated(),
  controller.sendCheckout)

router.get('/sendAnalytics',
  auth.isAuthenticated(),
  controller.sendAnalytics)

module.exports = router
