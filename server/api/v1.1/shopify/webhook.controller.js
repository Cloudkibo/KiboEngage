/**
 * Created by sojharo on 27/07/2017.
 */

const logger = require('../../../components/logger')
const TAG = 'api/shopify/webhook.controller.js'
const mainScript = require('./mainScript')
const config = require('./../../../config/environment/index')
const dataLayer = require('./../abandoned_carts/abandoned_carts.datalayer')

exports.handleCheckout = function (req, res) {
  const productIds = req.body.line_items.map((item) => {
    return item.product_id
  })
  const shopUrl = req.header('X-Shopify-Shop-Domain')
  dataLayer.findOneStoreInfoGeneric({ shopUrl: shopUrl })
    .then(results => {
      const shopId = results._id
      const userId = results.userId
      const companyId = results.companyId
      dataLayer.findOneCartInfo({ cartToken: req.body.cart_token })
        .then(cart => {
          if (cart) {
            if (cart.userRef) {
              const checkout = {
                shopifyCheckoutId: req.body.id,
                checkoutToken: req.body.token,
                cartToken: req.body.cart_token,
                storeId: shopId,
                userId: userId,
                companyId: companyId,
                totalPrice: req.body.total_price,
                abandonedCheckoutUrl: req.body.abandoned_checkout_url,
                productIds: productIds,
                status: 'pending',
                userRef: cart.userRef
              }
              // We need to update the analytics against this store
              dataLayer.findOneStoreAnalyticsObjectAndUpdate({ storeId: shopId }, { $inc: { totalAbandonedCarts: 1 } })
                .then(result1 => {
                  dataLayer.createCheckOutInfo(checkout)
                    .then(createdCheckout => res.status(200).json({ status: 'success', payload: createdCheckout }))
                    .catch(err => res.status(500).json({ status: 'failed', error: err }))
                })
                .catch(err => res.status(500).json({ status: 'failed', error: err }))
            } else {
              logger.serverLog(TAG, 'UserRef Not Found to save checkout')
              return res.status(200).json({ status: 'success', payload: 'cart not found' })
            }
          } else {
            logger.serverLog(TAG, 'Cart Not Found to save checkout')
            return res.status(200).json({ status: 'success', payload: 'cart not found' })
          }
        })
        .catch(err => res.status(500).json({ status: 'failed', error: err }))
    })
    .catch(err => res.status(500).json({ status: 'failed', error: err }))
}

exports.handleCart = function (req, res) {
  const productIds = req.body.line_items.map((item) => {
    return item.product_id
  })
  const shopUrl = req.header('X-Shopify-Shop-Domain')
  dataLayer.findOneStoreInfoGeneric({ shopUrl: shopUrl })
    .then(results => {
      const shopId = results._id
      const userId = results.userId
      const companyId = results.companyId
      const cart = {
        shopifyCartId: req.body.id,
        cartToken: req.body.token,
        storeId: shopId,
        userId: userId,
        companyId: companyId,
        linePrice: 0,
        productIds: productIds,
        status: 'pending',
        userRef: ''
      }
      dataLayer.createCartInfo(cart)
        .then(createdCart => res.status(200).json({ status: 'success', payload: createdCart }))
        .catch(err => res.status(500).json({ status: 'failed', error: err }))
    })
    .catch(err => {
      if (Object.keys(err).length === 0) {
        logger.serverLog(TAG, `Cannot find storeInfo`)
        return res.status(200).json({ status: 'failed', error: 'Cannot find storeInfo' })
      } else {
        logger.serverLog(TAG, `Error in cart webhook ${JSON.stringify(err)}`)
        return res.status(500).json({ status: 'failed', error: err })
      }
    })
}

exports.handleOrder = function (req, res) {
  logger.serverLog(TAG, `Order webhook called ${JSON.stringify(req.body.checkout_id)}`)
  dataLayer.findOneCheckOutInfo({ shopifyCheckoutId: req.body.checkout_id })
    .then(result => {
      if (result) {
        let newObj = {}
        if (result.status === 'pending') {
          newObj.isPurchased = true
        } else if (result.status === 'sent') {
          newObj.isPurchased = true
          newObj.isExtraSales = true    // It denotes that the product was bought after we sent abandond cart in messngr
          // We need to update the total purchases in Analytics
          dataLayer.findOneStoreAnalyticsObjectAndUpdate({ storeId: result.storeId },
            { $inc: { totalPurchasedCarts: 1, totalExtraSales: req.body.total_price } })
            .then(updated => logger.serverLog(TAG, `Done deleting checkout ${JSON.stringify(updated)}`))
            .catch(err => logger.serverLog(TAG, `Error in deleting checkout ${JSON.stringify(err)}`))
        }
        // Saving the updated info
        dataLayer.findOneCheckOutInfoObjectAndUpdate({ shopifyCheckoutId: req.body.checkout_id }, newObj)
          .then(updated => res.status(200).json({ status: 'success', payload: updated }))
          .catch(err => res.status(500).json({ status: 'failed', error: err }))
      } else {
        return res.status(200).json({ status: 'failed' })
      }
    })
    .catch(err => res.status(500).json({ status: 'failed', error: err }))
}

exports.handleAppUninstall = function (req, res) {
  const shopUrl = req.header('X-Shopify-Shop-Domain')
  dataLayer.findOneStoreInfoGeneric({ shopUrl: shopUrl })
    .then(results => {
      const shopId = results._id
      const deleteCart = dataLayer.deleteAllCartInfoObjectsGeneric({ storeId: shopId })
      const deleteCheckout = dataLayer.deleteAllCheckoutInfoObjects(shopId)
      const deleteStoreAnalytics = dataLayer.deleteAllStoreAnalyticsObjects({ storeId: shopId })
      const deleteStoreInfo = dataLayer.deleteAllStoreInfoObject({ shopUrl: shopUrl })
      Promise.all([deleteCart, deleteCheckout, deleteStoreAnalytics, deleteStoreInfo])
        .then(result => {
          res.status(200).json({ status: 'success' })
        })
        .catch(err => {
          res.status(500).json({ status: 'failed', error: err })
        })
    })
    .catch((err) => {
      if (Object.keys(err).length === 0) {
        logger.serverLog(TAG, `Cannot find storeInfo`)
        return res.status(200).json({ status: 'failed', error: 'Cannot find storeInfo' })
      } else {
        logger.serverLog(TAG, `Error in app uninstall webhook ${JSON.stringify(err)}`)
        return res.status(500).json({ status: 'failed', error: err })
      }
    })
}

exports.handleThemePublish = function (req, res) {
  logger.serverLog(TAG, 'A theme was switched')
  return res.status(200).json({ status: 'success' })
}

exports.serveScript = function (req, res) {
  const shopUrl = req.query.shop
  dataLayer.findOneStoreInfoGeneric({ shopUrl: shopUrl })
    .then(results => {
      const pageId = results.pageId
      res.set('Content-Type', 'text/javascript')
      res.send(mainScript.renderJS(pageId, config.facebook.clientID, results.shopUrl))
    })
    .catch(err => res.status(500).json({ status: 'failed', error: err }))
}

exports.handleNewSubscriber = function (payload) {
  logger.serverLog(TAG, `Got a new Shopify Subscriber`)
  // TODO: ADD Validation Check for payload
  // Get Page ID
  const pageId = payload.recipient.id
  // Get USER REF (Note USER REF is also the cart TOKEN)
  const userRef = payload.optin.user_ref

  const cartToken = payload.optin.user_ref.split('-')[0]

  dataLayer.findOneCartInfo({ cartToken: cartToken, userRef: '' })
    .then(cart => {
      dataLayer.findOneCartInfoObjectAndUpdate({ cartToken: cartToken, userRef: '' }, { userRef })
        .then(updated => logger.serverLog(TAG, `Updated cart info ${JSON.stringify(updated)}`))
        .catch(err => logger.serverLog(TAG, `Internal Server Error ${JSON.stringify(err)}`))
      return dataLayer.findOneStoreAnalyticsObjectAndUpdate({ storeId: cart.storeId }, { $inc: { totalSubscribers: 1 } })
    })
    .then(updated => logger.serverLog(TAG, `Updated Store analytics ${JSON.stringify(updated)}`))
    .catch(err => logger.serverLog(TAG, `Internal Server Error ${JSON.stringify(err)}`))
}

exports.clickCount = function (req, res) {
  logger.serverLog(TAG, `Query param received from Messenger Click ${req.query}`)
  dataLayer.findOneCheckOutInfo({ _id: req.query.checkoutId })
    .then(result => {
      if (!result) { return res.status(500).json({ status: 'failed', description: 'Cannot redirect to abandoned checkout' }) }
      logger.serverLog(TAG, `Incrementing the click count`)
      dataLayer.findOneStoreAnalyticsObjectAndUpdate({ storeId: result.storeId }, { $inc: { totalClicks: 1 } })
        .then(updated => logger.serverLog(TAG, `Done updating click count ${JSON.stringify(updated)}`))
        .catch(err => logger.serverLog(TAG, `Error in updating click count ${JSON.stringify(err)}`))
      return res.redirect(result.abandonedCheckoutUrl)
    })
    .catch(err => {
      logger.serverLog(TAG, `Error in click count ${JSON.stringify(err)}`)
      return res.status(500).json({ status: 'failed', description: 'Failed to find the checkout' })
    })
}
