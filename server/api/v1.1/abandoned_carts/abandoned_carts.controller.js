/**
 * Created by sojharo on 27/07/2017.
 */

const logger = require('../../../components/logger')
const utility = require('./utility_abandoned')
const utilityApi = require('../utility')
const dataLayer = require('./abandoned_carts.datalayer')
const TAG = 'api/abandonedCarts/abandoned_carts.controller.js'
// const Users = require('./../user/Users.model')
// const needle = require('needle')
// const Subscribers = require('../subscribers/Subscribers.model')

const _ = require('lodash')

exports.index = function (req, res) {
  utilityApi.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      return dataLayer.findAllStoreInfo(companyUser.companyId)
    })
    .then(storeInfoFound => {
      return res.status(200).json({ status: 'success', payload: storeInfoFound })
    })
    .catch(err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
    })
}

// Right now we are not using this API but later on we will use it once we move the webhooks
// to a separate droplet
exports.saveStoreInfo = function (req, res) {
  const store = {
    userId: req.body.userId,
    pageId: req.body.pageId,
    shopUrl: req.body.shopUrl,
    shopToken: req.body.shopToken
  }
  dataLayer.createStoreInfo(store)
    .then(storeInfo => res.status(200).json({ status: 'success', payload: storeInfo }))
    .catch(err => res.status(500).json({ status: 'failed', error: err }))
}

// Right now we are not using this API but later on we will use it once we move the webhooks
// to a separate droplet
exports.saveCartInfo = function (req, res) {
  const cart = {
    shopifyCartId: req.body.shopifyCartId,
    cartToken: req.body.cartToken,
    storeId: req.body.storeId,
    linePrice: req.body.linePrice,
    productIds: req.body.productIds
  }
  dataLayer.createCartInfo(cart)
    .then(cartInfo => res.status(200).json({ status: 'success', payload: cartInfo }))
    .catch(err => res.status(500).json({ status: 'failed', error: err }))
}

// Right now we are not using this API but later on we will use it once we move the webhooks
// to a separate droplet
exports.saveCheckoutInfo = function (req, res) {
  const checkout = {
    shopifyCheckoutId: req.body.shopifyCheckoutId,
    checkoutToken: req.body.checkoutToken,
    cartToken: req.body.cartToken,
    storeId: req.body.storeId,
    totalPrice: req.body.totalPrice,
    abandonedCheckoutUrl: req.body.abandonedCheckoutUrl,
    productIds: req.body.productIds
  }
  dataLayer.createCartInfo(checkout)
    .then(checkoutInfo => res.status(200).json({ status: 'success', payload: checkoutInfo }))
    .catch(err => res.status(500).json({ status: 'failed', error: err }))
}

exports.updateStatusStore = function (req, res) {
  let parametersMissing = false

  if (!_.has(req.body, 'shopId')) parametersMissing = true
  if (!_.has(req.body, 'isActive')) parametersMissing = true

  if (parametersMissing) {
    return res.status(400)
      .json({ status: 'Failed', description: 'Parameters are missing' })
  }
  dataLayer.findOneStoreInfoObjectAndUpdate({ _id: req.body.shopId }, { isActive: req.body.isActive })
    .then(result => res.status(200).json({ status: 'success', payload: result }))
    .catch(err => res.status(500).json({ status: 'Failed', error: err }))
}

exports.deleteAllCartInfo = function (req, res) {
  let parametersMissing = false

  if (!_.has(req.body, 'storeId')) parametersMissing = true

  if (parametersMissing) {
    return res.status(400)
      .json({ status: 'Failed', description: 'Parameters are missing' })
  }
  dataLayer.deleteAllCartInfoObjects(req.body.storeId)
    .then(result => {
      if (result) {
        return res.status(200).json({ status: 'success', payload: result })
      } else {
        return res.status(404).json({
          status: 'failed',
          description: 'The Cart Info deletion failed'
        })
      }
    })
    .catch(err => res.status(500).json({ status: 'Failed', error: err }))
}

exports.deleteOneCartInfo = function (req, res) {
  let parametersMissing = false

  if (!_.has(req.body, 'storeId')) parametersMissing = true
  if (!_.has(req.body, 'cartInfoId')) parametersMissing = true

  if (parametersMissing) {
    return res.status(400)
      .json({ status: 'Failed', description: 'Parameters are missing' })
  }
  dataLayer.deleteOneCartInfoObject({ storeId: req.body.storeId, _id: req.body.cartInfoId })
    .then(result => {
      if (result) {
        return res.status(200).json({ status: 'success', payload: result })
      } else {
        return res.status(404).json({
          status: 'failed',
          description: 'The Cart Info deletion failed'
        })
      }
    })
    .catch(err => res.status(500).json({ status: 'Failed', error: err }))
}

exports.deleteCheckoutInfo = function (req, res) {
  let parametersMissing = false

  if (!_.has(req.body, 'checkoutInfoId')) parametersMissing = true

  if (parametersMissing) {
    return res.status(400)
      .json({ status: 'Failed', description: 'Parameters are missing' })
  }
  dataLayer.deleteOneCheckOutInfoObject(req.body.checkoutInfoId)
    .then(result => {
      if (result) {
        return res.status(200).json({ status: 'success', payload: result })
      } else {
        return res.status(404).json({
          status: 'failed',
          description: 'The Checkout Info deletion failed'
        })
      }
    })
    .catch(err => res.status(500).json({ status: 'Failed', error: err }))
}

exports.deleteAllInfo = function (req, res) {
  utilityApi.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      return dataLayer.findAllStoreInfo(companyUser.companyId)
    })
    .then(stores => {
      let store
      for (let i = 0, length = stores.length; i < length; i++) {
        store = stores[i]
        if (store) {
          dataLayer.deleteAllCheckoutInfoObjects(store._id)
            .then(() => {
              return dataLayer.deleteOneCartInfoObject({ storeId: store._id })
            })
            .then(() => {
              return dataLayer.deleteOneStoreInfoObject({ _id: store._id })
            })
            .then(() => {
              if (i === stores.length - 1) {
                res.status(200).json({ status: 'success', payload: 'All information has been deleted' })
              }
            })
            .catch(err => {
              if (err) {
                res.status(404).json({
                  status: 'failed',
                  description: 'The All delete Info failed'
                })
              }
            })
        }
      }
    })
    .catch(err => res.status(500).json({ status: 'Failed', error: err }))
}

exports.sendCheckout = function (req, res) {
  let parametersMissing = false

  if (!_.has(req.body, 'id')) parametersMissing = true

  if (parametersMissing) {
    return res.status(400)
      .json({ status: 'Failed', description: 'Parameters are missing' })
  } else {
    utility.sendCheckout(req.body.id, (err, result) => {
      if (err) {
        logger.serverLog(TAG, `Error received from send checkout ${JSON.stringify(err)}`)
        return res.status(500).json({ status: 'Failed', description: err })
      } else if (result.status === 'Not Found') {
        return res.status(404)
          .json(result)
      } else {
        return res.status(200).json({ status: 'success', payload: { id: req.body.id } })
      }
    })
  }
}

exports.sendAnalytics = function (req, res) {
  utilityApi.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      return dataLayer.findOneStoreInfo(companyUser.companyId)
    })
    .then(store => {
      if (store) {
        dataLayer.findOneStoreAnalytics(store._id)
          .then(analytics => res.status(200).json({ status: 'success', payload: analytics }))
          .catch(err => res.status(500).json({ status: 'failed', error: err }))
      } else {
        res.status(404)
          .json({ status: 'failed', description: 'No analytics found against this store' })
      }
    })
    .catch(err => res.status(500).json({ status: 'failed', error: err }))
}

exports.abandonedCheckouts = function (req, res) {
  utilityApi.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      return dataLayer.findAllCheckoutInfo({ companyId: companyUser.companyId, isPurchased: false })
    })
    .then(result => res.status(200).json({ status: 'success', payload: result }))
    .catch(err => res.status(500).json({ status: 'failed', error: err }))
}
