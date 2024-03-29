const logger = require('../server/components/logger')
const DataLayer = require('../server/api/v1.1/abandoned_carts/abandoned_carts.datalayer')
const utility = require('../server/api/v1.1/abandoned_carts/utility_abandoned')
const TAG = 'scripts/abandoned-script.js'

var https = require('https')

exports.runScript = function () {
  https.get('https://cronhub.io/ping/65f023a0-9976-11e9-804f-135aa1b0e11c')
  /*
  { isPurchased: false,
  scheduled_at: { '$lt': Date.now() }
  }
  */
  DataLayer.findAllCheckoutInfo({
    isPurchased: false,
    scheduled_at: { '$lt': Date.now() }
  })
    .then(data => {
      if (data) {
        if (data.length === 0) return
        for (let i = 0; i < data.length; i++) {
          DataLayer.findOneStoreInfoGeneric({_id: data[i].storeId})
            .then(store => {
              if (store && store.cartAlertEnabled) {
                utility.sendCheckout(data[i]._id, (err) => {
                  if (err) {
                    const message = err || 'Failed to send checkout'
                    logger.serverLog(message, `${TAG}: exports.runScript`, data, {}, 'error')
                  }
                  if (i === data.length - 1) https.get('https://cronhub.io/finish/65f023a0-9976-11e9-804f-135aa1b0e11c')
                })
              }
            })
            .catch(err => {
              https.get('https://cronhub.io/finish/65f023a0-9976-11e9-804f-135aa1b0e11c')
              const message = err || 'Failed to find store'
              logger.serverLog(message, `${TAG}: exports.runScript`, data, {}, 'error')
            })
        }
      }
    })
    .catch(err => {
      https.get('https://cronhub.io/finish/65f023a0-9976-11e9-804f-135aa1b0e11c')
      const message = err || 'No checkout found'
      logger.serverLog(message, `${TAG}: exports.runScript`, {isPurchased: false, scheduled_at: { '$lt': Date.now() }}, {}, 'error')
    })
}
