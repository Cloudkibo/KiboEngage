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
  logger.serverLog(TAG, JSON.stringify(productIds))

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
      logger.serverLog(TAG, `SHOPIFY Got the page info ${JSON.stringify(page)}`)
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
        uri: 'https://graph.facebook.com/v2.6/me/messages?access_token=' + page.accessToken,
        method: 'POST',
        json: {
          'recipient': {
            'user_ref': checkout.userRef
          },
          'message': payload
        }
      }
      logger.serverLog(TAG, `SHOPIFY Sending the following info ${JSON.stringify(options)}`)
      request(options, function (error, response, body) {
        logger.serverLog(TAG, `SHOPIFY Sent the abandoned cart successfully ${JSON.stringify(response)} ${JSON.stringify(body)} ${JSON.stringify(error)}`)
        if (!error && response.statusCode === 200) {
          return logger.serverLog(TAG, `SHOPIFY Sent the abandoned cart successfully`)
        } else {
          sendOpAlert(body.error, 'utility abandoned in kiboengage', page._id, page.userId._id, page.companyId)
          return logger.serverLog(TAG, `SHOPIFY Batch send error ${JSON.stringify(response)}`)
        }
      })
    })
    .catch(err => logger.serverLog(TAG, `Internal Server Error ${JSON.stringify(err)}`))
}

function sendOrderStatusToFacebook (order, statusMessage, store) {
  utilityAPI.callApi(`pages/query`, 'post', { pageId: store.pageId, connected: true })
    .then(page => {
      logger.serverLog(TAG, `SHOPIFY Got the page info ${JSON.stringify(page)}`)
      page = page[0]
      let payload = {}
      payload = {
        'text': statusMessage
      }
      let options = {
        uri: 'https://graph.facebook.com/v2.6/me/messages?access_token=' + page.accessToken,
        method: 'POST',
        json: {
          'recipient': {
            'user_ref': order.userRef
          },
          'message': payload
        }
      }
      logger.serverLog(TAG, `SHOPIFY Sending the following info ${JSON.stringify(options)}`)
      request(options, function (error, response, body) {
        logger.serverLog(TAG, `SHOPIFY Sent the order status successfully ${JSON.stringify(response)} ${JSON.stringify(body)} ${JSON.stringify(error)}`)
        if (!error && response.statusCode === 200) {
          sendOpAlert(body.error, 'utility abandoned in kiboengage', page._id, page.userId._id, page.companyId)
          return logger.serverLog(TAG, `SHOPIFY Sent the order status successfully`)
        } else {
          return logger.serverLog(TAG, `SHOPIFY Batch send error ${JSON.stringify(response)}`)
        }
      })
    })
    .catch(err => logger.serverLog(TAG, `Internal Server Error ${JSON.stringify(err)}`))
}

// const send = (batchMessages, page) => {
//   const r = request.post('https://graph.facebook.com', (err, httpResponse, body) => {
//     if (err) {
//       return logger.serverLog(TAG, `Batch send error ${JSON.stringify(err)}`)
//     }
//     logger.serverLog(TAG, `Batch send response ${JSON.stringify(body)}`)
//   })
//   const form = r.form()
//   form.append('access_token', page.accessToken)
//   form.append('batch', batchMessages)
// }

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
                logger.serverLog(TAG, `Error in fetching product details ${JSON.stringify(err)}`)
                return cb(err, null)
              }
              logger.serverLog(TAG, 'Product Details: ' + details)
              sendToFacebook(checkout, store, details)
              // checkout.status = 'sent'
              // checkout.sentCount = checkout.sentCount + 1
              dataLayer.findOneStoreAnalyticsObjectAndUpdate({ storeId: store._id }, { $inc: { totalPushSent: 1 } })
                .then(updated => logger.serverLog(TAG, `Done updating store analytics ${JSON.stringify(updated)}`))
                .catch(err => cb(err, null))
              dataLayer.findOneCheckOutInfoObjectAndUpdate(
                { _id: id, sentCount: { '$lt': 3 } },
                {status: 'sent', sentCount: checkout.sentCount + 1})
                .then(updated => logger.serverLog(TAG, `Done updating store analytics ${JSON.stringify(updated)}`))
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
