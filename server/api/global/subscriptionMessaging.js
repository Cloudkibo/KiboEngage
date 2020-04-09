const { facebookApiCaller } = require('./facebookApiCaller')
const logger = require('../../components/logger')
const TAG = 'global/subscriptionMessaging.js'

exports.isApprovedForSMP = (page) => {
  return new Promise((resolve, reject) => {
    if (page.tasks && page.tasks.includes('MANAGE')) {
      facebookApiCaller(
        'v6.0',
        `me/messaging_feature_review?access_token=${page.accessToken}`,
        'GET'
      )
        .then(response => {
          if (response.body.error) {
            logger.serverLog(TAG, `Failed to check subscription_messaging permission status ${response.body.error}`, 'error')
            resolve(false)
          } else {
            let data = response.body.data
            let smp = data.filter((d) => d.feature === 'subscription_messaging')
            if (smp.length > 0 && smp[0].status.toLowerCase() === 'approved') {
              resolve('approved')
            } else if (smp.length > 0 && smp[0].status.toLowerCase() === 'rejected') {
              resolve('rejected')
            } else if (smp.length > 0 && smp[0].status.toLowerCase() === 'pending') {
              resolve('pending')
            } else {
              resolve('notApplied')
            }
          }
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to check subscription_messaging permission status ${err}`, 'error')
          resolve(false)
        })
    } else {
      resolve(true)
    }
  })
}
