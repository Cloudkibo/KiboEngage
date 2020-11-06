const logger = require('../../../components/logger')
const TAG = 'api/abandoned_checkouts/utility_abandoned.js'
const Shopify = require('shopify-api-node')
const request = require('request')
const config = require('./../../../config/environment/index')
const utilityAPI = require('../utility')
const dataLayer = require('./abandoned_carts.datalayer')
let { sendOpAlert } = require('./../../global/operationalAlert')

// This function needs store Object as well because from store will we read the shop URL and token
// We also need to pass callback because shopify makes a async call and we need the result back in calling function
function fetchProductDetails (productIds, store, callBack) {
  const shopify = new Shopify({
    shopName: store.shopUrl,
    accessToken: store.shopToken
  })
  let arr = []
  for (let i = 0, productId, length = productIds.length; i < length; i++) {
    productId = productIds[i]
    shopify.product.get(productId)
      .then((resProduct) => {
        arr.push(resProduct)
        if (i === (length - 1)) {
          return callBack(null, arr)
        }
      })
      .catch((err) => {
        return callBack(err, null)
      })
  }
}

function sendToFacebook (checkout, store, details) {
  utilityAPI.callApi(`pages/query`, 'post', { pageId: store.pageId, connected: true })
    .then(page => {
      page = page[0]
      let gallery = []
      let payload = {}
      if (details.length > 0) {
        details.forEach((item) => {
          console.log('itemdetails', item)
          let temp = {
            title: item.title,
            buttons: [{ 'type': 'web_url', 'url': `${config.domain}/api/shopify/clickCount?checkoutId=${checkout._id}`, 'title': 'Visit Product' }],
            subtitle: store.alertMessage, // 'You forgot to checkout this product' + '. Vendor: ' + item.vendor,
            image_url: (item.image && item.image.src) ? item.image.src : 'https://cdn.shopify.com/assets/images/logos/shopify-bag.png'
          }
          gallery.push(temp)
        })
        payload = {
          'attachment': {
            'type': 'template',
            'payload': {
              'template_type': 'generic',
              'elements': gallery
            }
          }
        }
      }
      let options = {
        uri: 'https://graph.facebook.com/v6.0/me/messages?access_token=' + page.accessToken,
        method: 'POST',
        json: {
          'recipient': {
            'user_ref': checkout.userRef
          },
          'message': payload
        }
      }
      request(options, function (error, response, body) {
        if (error && response.statusCode !== 200) {
          sendOpAlert(body.error, 'utility abandoned in kiboengage', page._id, page.userId, page.companyId)
          const message = error || 'SHOPIFY Batch send error'
          logger.serverLog(message, `${TAG}: sendToFacebook`, {checkout, store, details}, {}, 'error')
        }
      })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: sendToFacebook`, {checkout, store, details}, {}, 'error')
    })
}

function sendOrderStatusToFacebook (order, statusMessage, store) {
  utilityAPI.callApi(`pages/query`, 'post', { pageId: store.pageId, connected: true })
    .then(page => {
      page = page[0]
      let payload = {}
      payload = {
        'text': statusMessage
      }
      let options = {
        uri: 'https://graph.facebook.com/v6.0/me/messages?access_token=' + page.accessToken,
        method: 'POST',
        json: {
          'recipient': {
            'user_ref': order.userRef
          },
          'message': payload
        }
      }
      request(options, function (error, response, body) {
        if (error && response.statusCode !== 200) {
          const message = error || 'sending order status to facebook error'
          return logger.serverLog(message, `${TAG}: sendOrderStatusToFacebook`, order, {}, 'error')
        }
      })
    })
    .catch(err => {
      const message = err || 'Internal server error'
      logger.serverLog(message, `${TAG}: sendOrderStatusToFacebook`, order, {}, 'error')
    })
}

const sendOrderStatus = (id, statusMessage, cb) => {
  dataLayer.findOneOrderInfoGeneric({ orderId: id })
    .then(order => {
      if (order) {
        dataLayer.findOneStoreInfoGeneric({ _id: order.storeId })
          .then(store => {
            sendOrderStatusToFacebook(order, statusMessage, store)
          })
          .catch(err => cb(err, null))
      } else {
        return cb(null, { status: 'Not Found', payload: 'Order not found' })
      }
    })
    .catch(err => cb(err, null))
}

const sendCheckout = (id, cb) => {
  dataLayer.findOneCheckOutInfo({ _id: id, sentCount: { '$lt': 3 } })
    .then(checkout => {
      if (checkout) {
        dataLayer.findOneStoreInfoGeneric({ _id: checkout.storeId })
          .then(store => {
            fetchProductDetails(checkout.productIds, store, (err, details) => {
              if (err) {
                const message = err || 'Error in fetching product details'
                logger.serverLog(message, `${TAG}: sendCheckout`, {id, cb}, {}, 'error')
                return cb(err, null)
              }
              sendToFacebook(checkout, store, details)
              // checkout.status = 'sent'
              // checkout.sentCount = checkout.sentCount + 1
              dataLayer.findOneStoreAnalyticsObjectAndUpdate({ storeId: store._id }, { $inc: { totalPushSent: 1 } })
                .then(updated => {})
                .catch(err => cb(err, null))
              dataLayer.findOneCheckOutInfoObjectAndUpdate(
                { _id: id, sentCount: { '$lt': 3 } },
                {status: 'sent', sentCount: checkout.sentCount + 1})
                .then(updated => {})
                .catch(err => cb(err, null))
              cb(null, { status: 'Success', payload: 'Checkout Sent' })
            })
          })
          .catch(err => cb(err, null))
      } else {
        return cb(null, { status: 'Not Found', payload: 'Checkout not found' })
      }
    })
    .catch(err => cb(err, null))
}

exports.sendCheckout = sendCheckout
exports.fetchProductDetails = fetchProductDetails
exports.sendToFacebook = sendToFacebook
exports.sendOrderStatusToFacebook = sendOrderStatusToFacebook
exports.sendOrderStatus = sendOrderStatus
