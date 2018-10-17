let mongoose = require('mongoose')
const logger = require('../server/components/logger')
const config = require('../server/config/environment')
const CheckoutInfo = require('../server/api/abandoned_carts/CheckoutInfo.model')
const utility = require('../server/api/abandoned_carts/utility_abandoned')
const TAG = 'scripts/abandoned-script.js'

const request = require('request')

mongoose = mongoose.connect(config.mongo.uri)

var https = require('https')
https.get('https://cronhub.io/ping/8ba0c020-9c23-11e8-98df-53965cfb8da9')

/*
{ isPurchased: false,
  scheduled_at: { '$lt': Date.now() }
}
*/
CheckoutInfo.find({ isPurchased: false,
  scheduled_at: { '$lt': Date.now() }
}, (err, data) => {
  if (err) {
    logger.serverLog(TAG, `No Checkout found ${JSON.stringify(err)}`)
    setTimeout(function (mongoose) { closeDB(mongoose) }, 2000)
  }
  if (data.length === 0) {
    setTimeout(function (mongoose) { closeDB(mongoose) }, 2000)
  }
  if (data) {
    logger.serverLog(TAG, `Checkout Fetched ${JSON.stringify(data)}`)
    for (let i = 0; i < data.length; i++) {
      utility.sendCheckout(data[i]._id, (err) => {
        if (err) {
          logger.serverLog(TAG, `Error in sending checkout ${JSON.stringify(err)}`)
        }
      })
    }
    setTimeout(function (mongoose) { closeDB(mongoose) }, 20000)
  } else {
    setTimeout(function (mongoose) { closeDB(mongoose) }, 2000)
  }
   // If data clause check
})  // CheckoutInfo find ends here

function closeDB () {
  logger.serverLog(TAG, `Closing Database Connection`)
  mongoose.disconnect(function (err) {
    if (err) throw err
    console.log('disconnected')
    process.exit()
  })
}
