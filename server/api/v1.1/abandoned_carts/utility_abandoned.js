const CheckoutInfo = require('./CheckoutInfo.model')
const StoreInfo = require('./StoreInfo.model')
const Pages = require('../pages/Pages.model')
const utility = require('../broadcasts/broadcasts.utility')
const logger = require('../../../components/logger')
const TAG = 'api/abandoned_checkouts/utility_abandoned.js'
const Shopify = require('shopify-api-node')
const StoreAnalytics = require('./StoreAnalytics.model')
const request = require('request')
const config = require('./../../../config/environment/index')

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
  Pages.findOne({pageId: store.pageId}, (err, page) => {
    if (err) {
      return logger.serverLog(TAG, `Internal Server Error ${JSON.stringify(err)}`)
    }
    let obj
    let gallery = []
    let payload = {}
    if (details.length <= 1) {
        // Send one card
      obj = {
        fileurl: {
          url: (details[0].image && details[0].image.src) ? details[0].image.src : 'https://cdn.shopify.com/assets/images/logos/shopify-bag.png'
        },
        componentType: 'card',
        title: details[0].title,
        buttons: [{'type': 'web_url', 'url': `${config.domain}/api/shopify/clickCount?checkoutId=${checkout._id}`, 'title': 'Visit Product'}],
        description: 'You forgot to checkout this product' + '. Vendor: ' + details[0].vendor
      }
      payload = obj
    } else {
        // Send Gallary
      details.forEach((item) => {
        let temp = {
          title: item.title,
          buttons: [{'type': 'web_url', 'url': `${config.domain}/api/shopify/clickCount?checkoutId=${checkout._id}`, 'title': 'Visit Our Shop'}],
          subtitle: 'You forgot to checkout this product' + '. Vendor: ' + item.vendor,
          image_url: (item.image && item.image.src) ? item.image.src : 'https://cdn.shopify.com/assets/images/logos/shopify-bag.png'
        }
        gallery.push(temp)
      })
      obj = {
        componentType: 'gallery',
        cards: gallery
      }
      payload = obj
    }
    let options = {
      uri: 'https://graph.facebook.com/v2.6/me/messages?access_token=' + page.accessToken,
      method: 'POST',
      json: {
        'recipient': {
          'user_ref': checkout.userRef
        },
        'message': utility.prepareMessageData(page, checkout.userRef, payload, 'f_name', 'l_name')
      }
    }
    logger.serverLog(TAG, `Sending the following info ${JSON.stringify(options)}`)
    request(options, function (error, response, body) {
      logger.serverLog(TAG, `Sent the abandoned cart successfully ${JSON.stringify(response)} ${JSON.stringify(body)} ${JSON.stringify(error)}`)
      if (!error && response.statusCode == 200) {
        return logger.serverLog(TAG, `Sent the abandoned cart successfully`)
      } else {
        return logger.serverLog(TAG, `Batch send error ${JSON.stringify(response)}`)
      }
    })
  }) // Pages findOne ends here
}

const send = (batchMessages, page) => {
  const r = request.post('https://graph.facebook.com', (err, httpResponse, body) => {
    if (err) {
      return logger.serverLog(TAG, `Batch send error ${JSON.stringify(err)}`)
    }
    logger.serverLog(TAG, `Batch send response ${JSON.stringify(body)}`)
  })
  const form = r.form()
  form.append('access_token', page.accessToken)
  form.append('batch', batchMessages)
}

const sendCheckout = (id, cb) => {
  CheckoutInfo.findOne({_id: id, sentCount: { '$lt': 3 }}, (err, checkout) => {
    if (err) {
      logger.serverLog(TAG, `Cannot find the checkout ${JSON.stringify(err)}`)
      return cb(err, null)
    }

    if (checkout) {
      StoreInfo.findOne({_id: checkout.storeId}, (err, store) => {
        if (err) {
          logger.serverLog(TAG, `Cannot find the store ${JSON.stringify(err)}`)
          return cb(err, null)
        }

        fetchProductDetails(checkout.productIds, store, (err, details) => {
          if (err) {
            logger.serverLog(TAG, `Error in fetching product details ${JSON.stringify(err)}`)
            return cb(err, null)
          }

          logger.serverLog(TAG, 'Product Details: ' + details)
          sendToFacebook(checkout, store, details)
          checkout.status = 'sent'
          checkout.sentCount = checkout.sentCount + 1
          StoreAnalytics.findOneAndUpdate({storeId: store._id}, {$inc: {totalPushSent: 1}}, (err) => {
            if (err) {
              logger.serverLog(TAG, `Error in updating analytics ${JSON.stringify(err)}`)
              return cb(err, null)
            }
          })
          checkout.save((err) => {
            if (err) {
              logger.serverLog(TAG, `Error in updating checkout ${JSON.stringify(err)}`)
              return cb(err, null)
            }

            return cb(null, {status: 'Success', payload: 'Checkout Sent'})
          })  // Checkout Info Save
        })  // Fetch Product Details Callback
      }) // StoreInfo Find One
    } else {
      return cb(null, {status: 'Not Found', payload: 'Checkout not found'})
    }
  })
}

exports.sendCheckout = sendCheckout
exports.fetchProductDetails = fetchProductDetails
exports.sendToFacebook = sendToFacebook
