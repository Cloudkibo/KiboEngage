/**
 * Created by sojharo on 27/07/2017.
 */

const logger = require('../../../components/logger')
const StoreInfo = require('./StoreInfo.model')
const CartInfo = require('./CartInfo.model')
const CheckoutInfo = require('./CheckoutInfo.model')
const utility = require('./utility_abandoned')
const CompanyUsers = require('./../companyuser/companyuser.model')
const StoreAnalytics = require('./StoreAnalytics.model')
const TAG = 'api/abandonedCarts/abandoned_carts.controller.js'
// const Users = require('./../user/Users.model')
// const needle = require('needle')
// const Subscribers = require('../subscribers/Subscribers.model')

const _ = require('lodash')

exports.index = function (req, res) {
  CompanyUsers.findOne({domain_email: req.user.domain_email}, (err, companyUser) => {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    }
    if (!companyUser) {
      return res.status(404).json({
        status: 'failed',
        description: 'The user account does not belong to any company. Please contact support'
      })
    }
    StoreInfo.find({companyId: companyUser.companyId}).exec()
    .then((result) => {
      return res.status(200).json({status: 'success', payload: result})
    })
    .catch((err) => {
      return res.status(500).json({status: 'failed', error: err})
    })
  })
}

// Right now we are not using this API but later on we will use it once we move the webhooks
// to a separate droplet
exports.saveStoreInfo = function (req, res) {
  const store = new StoreInfo({
    userId: req.body.userId,
    pageId: req.body.pageId,
    shopUrl: req.body.shopUrl,
    shopToken: req.body.shopToken
  })
  store.save((err) => {
    if (err) {
      return res.status(500).json({ status: 'failed', error: err })
    }
    return res.status(200).json({status: 'success'})
  })
}

// Right now we are not using this API but later on we will use it once we move the webhooks
// to a separate droplet
exports.saveCartInfo = function (req, res) {
  const cart = new CartInfo({
    shopifyCartId: req.body.shopifyCartId,
    cartToken: req.body.cartToken,
    storeId: req.body.storeId,
    linePrice: req.body.linePrice,
    productIds: req.body.productIds
  })
  cart.save((err) => {
    if (err) {
      return res.status(500).json({ status: 'failed', error: err })
    }
    return res.status(200).json({status: 'success'})
  })
}

// Right now we are not using this API but later on we will use it once we move the webhooks
// to a separate droplet
exports.saveCheckoutInfo = function (req, res) {
  const checkout = new CheckoutInfo({
    shopifyCheckoutId: req.body.shopifyCheckoutId,
    checkoutToken: req.body.checkoutToken,
    cartToken: req.body.cartToken,
    storeId: req.body.storeId,
    totalPrice: req.body.totalPrice,
    abandonedCheckoutUrl: req.body.abandonedCheckoutUrl,
    productIds: req.body.productIds
  })
  checkout.save((err) => {
    if (err) {
      return res.status(500).json({ status: 'failed', error: err })
    }
    return res.status(200).json({status: 'success'})
  })
}

exports.updateStatusStore = function (req, res) {
  let parametersMissing = false

  if (!_.has(req.body, 'shopId')) parametersMissing = true
  if (!_.has(req.body, 'isActive')) parametersMissing = true

  if (parametersMissing) {
    return res.status(400)
      .json({status: 'Failed', description: 'Parameters are missing'})
  }

  StoreInfo.updateOne({_id: req.body.shopId}, {isActive: req.body.isActive}, (err, result) => {
    if (err) {
      return res.status(500).json({ status: 'Failed', error: err })
    }

    return res.status(200).json({status: 'success', payload: result})
  })
}

exports.deleteAllCartInfo = function (req, res) {
  let parametersMissing = false

  if (!_.has(req.body, 'storeId')) parametersMissing = true

  if (parametersMissing) {
    return res.status(400)
      .json({status: 'Failed', description: 'Parameters are missing'})
  }

  CartInfo.remove({storeId: req.body.storeId}, (err, result) => {
    if (err) {
      return res.status(500).json({ status: 'Failed', error: err })
    }

    if (result) {
      return res.status(200).json({status: 'success', payload: result})
    } else {
      return res.status(404).json({
        status: 'failed',
        description: 'The Cart Info deletion failed'
      })
    }
  })
}

exports.deleteOneCartInfo = function (req, res) {
  let parametersMissing = false

  if (!_.has(req.body, 'storeId')) parametersMissing = true
  if (!_.has(req.body, 'cartInfoId')) parametersMissing = true

  if (parametersMissing) {
    return res.status(400)
      .json({status: 'Failed', description: 'Parameters are missing'})
  }

  CartInfo.remove({storeId: req.body.storeId, _id: req.body.cartInfoId}, (err, result) => {
    if (err) {
      return res.status(500).json({ status: 'Failed', error: err })
    }

    if (result) {
      return res.status(200).json({status: 'success', payload: result})
    } else {
      return res.status(404).json({
        status: 'failed',
        description: 'The Cart Info deletion failed'
      })
    }
  })
}

exports.deleteCheckoutInfo = function (req, res) {
  let parametersMissing = false

  if (!_.has(req.body, 'checkoutInfoId')) parametersMissing = true

  if (parametersMissing) {
    return res.status(400)
      .json({status: 'Failed', description: 'Parameters are missing'})
  }

  CheckoutInfo.remove({_id: req.body.checkoutInfoId}, (err, result) => {
    if (err) {
      return res.status(500).json({ status: 'Failed', error: err })
    }

    if (result) {
      return res.status(200).json({status: 'success', payload: result})
    } else {
      return res.status(404).json({
        status: 'failed',
        description: 'The Checkout Info delete failed'
      })
    }
  })
}

exports.deleteAllInfo = function (req, res) {
  CompanyUsers.findOne({domain_email: req.user.domain_email}, (err, companyUser) => {
    if (err) {
      return res.status(500).json({ status: 'Failed', error: err })
    }

    if (!companyUser) {
      return res.status(404).json({
        status: 'failed',
        description: 'The user account does not belong to any company. Please contact support'
      })
    }

    StoreInfo.find({companyId: companyUser.companyId}, (err, stores) => {
      if (err) {
        return res.status(500).json({ status: 'Failed', error: err })
      }
      let store
      // I am using for loop because it is fastest loop. Moreover, the use 'let' makes it secure and not unpredictable
      for (let i = 0, length = stores.length; i < length; i++) {
        store = stores[i]
        if (store) {
          CheckoutInfo.remove({storeId: store._id}, (err, result1) => {
            if (err) {
              return res.status(500).json({ status: 'Failed', error: err })
            }
            CartInfo.remove({storeId: store._id}, (err, result2) => {
              if (err) {
                return res.status(500).json({ status: 'Failed', error: err })
              }

              StoreInfo.remove({_id: store._id}, (err, result3) => {
                if (err) {
                  return res.status(500).json({ status: 'Failed', error: err })
                }

                if (result1 && result2 && result3) {
                  return res.status(200).json({status: 'success', payload: 'All information has been deleted'})
                } else {
                  return res.status(404).json({
                    status: 'failed',
                    description: 'The All delete Info failed'
                  })
                }
              }) // Store remove
            }) // CartInfo remove
          }) // CheckoutInfo remove
        }
      }
    })
  }) // Company User find One
}

exports.sendCheckout = function (req, res) {
  let parametersMissing = false

  if (!_.has(req.body, 'id')) parametersMissing = true

  if (parametersMissing) {
    return res.status(400)
      .json({status: 'Failed', description: 'Parameters are missing'})
  } else {
    utility.sendCheckout(req.body.id, (err, result) => {
      if (err) {
        logger.serverLog(TAG, `Error received from send checkout ${JSON.stringify(err)}`)
        return res.status(500).json({status: 'Failed', description: err})
      } else if (result.status === 'Not Found') {
        return res.status(404)
          .json(result)
      } else {
        return res.status(200).json({status: 'success', payload: {id: req.body.id}})
      }
    })
  }
}

exports.sendAnalytics = function (req, res) {
  CompanyUsers.findOne({domain_email: req.user.domain_email}, (err, companyUser) => {
    if (err) {
      return res.status(500).json({ status: 'failed', error: err })
    }

    if (!companyUser) {
      logger.serverLog(TAG, 'Cannot find companyUser')
      return res.status(404).json({
        status: 'failed',
        description: 'The user account does not belong to any company. Please contact support'
      })
    }

    // Fetching from Store Analytics
    StoreInfo.findOne({companyId: companyUser.companyId}, (err, store) => {
      if (err) {
        return res.status(500).json({status: 'failed', error: err})
      }

      if (store) {
        StoreAnalytics.findOne({storeId: store._id}, (err, analytics) => {
          if (err) {
            return res.status(500).json({status: 'failed', error: err})
          }
          logger.serverLog(TAG, 'Going to send Analytics')
          return res.status(200).json({status: 'success', payload: analytics})
        })
      } else {
        logger.serverLog(TAG, 'No analytics found against this store')
        return res.status(404)
          .json({status: 'failed', description: 'No analytics found against this store'})
      }
    })
  })
}

exports.abandonedCheckouts = function (req, res) {
  CompanyUsers.findOne({domain_email: req.user.domain_email}, (err, companyUser) => {
    if (err) {
      return res.status(500).json({ status: 'Failed', error: err })
    }

    if (!companyUser) {
      return res.status(404).json({
        status: 'failed',
        description: 'The user account does not belong to any company. Please contact support'
      })
    }
    CheckoutInfo.find({companyId: companyUser.companyId, isPurchased: false}).exec()
    .then((result) => {
      return res.status(200).json({status: 'success', payload: result})
    })
    .catch((err) => {
      return res.status(500).json({status: 'failed', error: err})
    })
  })
}
