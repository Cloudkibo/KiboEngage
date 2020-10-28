const { facebookApiCaller } = require('./facebookApiCaller')
const logger = require('../../components/logger')
const TAG = 'global/subscriptionMessaging.js'
const { sendOpAlert } = require('./operationalAlert')
const  {sendEmail} = require('./sendEmail')

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
            logger.serverLog(TAG, `Failed to check subscription_messaging permission status from Facebook ${JSON.stringify(response.body.error)}`, 'error')
            if (response.body.error.code === 190) {
              sendFacebookReconnectEmail(page)
            }
            sendOpAlert(response.body.error, `Failed to check subscription_messaging permission status from Facebook ${JSON.stringify(response.body.error)}`, page._id, page.userId, page.companyId)
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
          sendOpAlert(err, `Failed to check subscription_messaging permission status ${JSON.stringify(err)}`, page._id, page.userId, page.companyId)
          resolve(false)
        })
    } else {
      resolve(true)
    }
  })
}

const sendFacebookReconnectEmail = function (page) {
  sendEmail(
    page.user.email,
    'KiboPush: Reconnect Facebook Account',
    'Reconnect Facebook Account on KiboPush',
    `Your page ${page.pageName} Access Token is expired because of Facebook security reason. Please Reconnect Your Facebook Account with KiboPush.`
  )
}
