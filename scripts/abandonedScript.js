const logger = require('../server/components/logger')
const DataLayer = require('../server/api/v1.1/abandoned_carts.datalayer')
const utility = require('../server/api/v1.1/abandoned_carts/utility_abandoned')
const TAG = 'scripts/abandoned-script.js'

var https = require('https')
https.get('https://cronhub.io/ping/8ba0c020-9c23-11e8-98df-53965cfb8da9')

exports.runScript = function () {
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
        logger.serverLog(TAG, `Checkout Fetched ${JSON.stringify(data)}`)
        for (let i = 0; i < data.length; i++) {
          utility.sendCheckout(data[i]._id, (err) => {
            if (err) {
              logger.serverLog(TAG, `Error in sending checkout ${JSON.stringify(err)}`)
            }
          })
        }
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `No Checkout found ${JSON.stringify(err)}`)
    })
}
