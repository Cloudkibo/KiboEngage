const utility = require('../server/api/v1.1/utility')
const logiclayer = require('./../server/api/v1.1/sponsoredMessaging/sponsoredMessaging.logiclayer')
const datalayer = require('./../server/api/v1.1/sponsoredMessaging/sponsoredMessaging.datalayer')
const { facebookApiCaller } = require('../server/api/global/facebookApiCaller')
let { sendOpAlert } = require('../server/api/global/operationalAlert')
const config = require('./../server/config/environment')
const { _storeAdAndCreativeIdsExport, _updateClickCountIdExport, _sendToClientUsingSocketExport } = require('./../server/api/v1.1/sponsoredMessaging/sponsoredMessaging.controller')
const logger = require('../server/components/logger')
const TAG = 'scripts/scheduleSponsored.js'

exports.runScheduleSponsored = () => {
  let cdt = new Date()
  datalayer.findAllSponsoredMessaging({status: 'scheduled', scheduleDateTime: {$lte: cdt}})
    .then(scheduledMessages => {
      for (let i = 0; i < scheduledMessages.length; i++) {
        startScheduledMessageProcess(scheduledMessages[i])
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch scheduled sponsored broadcast ${err}`, 'error')
    })
}

function startScheduledMessageProcess (scheduledMessage) {
  logger.serverLog(TAG, `Scheduled MESSAGE FOUND ${JSON.stringify(scheduledMessage)}`, 'error')
  utility.callApi(`companyUser/query`, 'post', { role: 'buyer', companyId: scheduledMessage.companyId })
    .then(companyUser => {
      return utility.callApi(`user/query`, 'post', {_id: companyUser.userId})
    })
    .then(user => {
      sendScheduledMessage(scheduledMessage, user[0].facebookInfo)
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch scheduled sponsored broadcast ${err}`, 'error')
    })
}

function sendScheduledMessage (scheduledMessage, facebookInfo) {
  let creativePayload = logiclayer.prepareAdCreativePayload(scheduledMessage, facebookInfo.fbToken)
  facebookApiCaller('v6.0', `${scheduledMessage.adAccountId}/adcreatives`, 'post', creativePayload)
    .then(adCreativeResp => {
      if (adCreativeResp.body.error) {
        logger.serverLog(TAG, `Error in Ad Creatives Create ${JSON.stringify(adCreativeResp.body)}`, 'error')
        sendOpAlert(adCreativeResp.body.error, 'sponsored messaging controller in kiboengage', '', '', '')
      } else {
        let messageCreativeId = adCreativeResp.body.id
        let adPayload = logiclayer.prepareAdPayload(scheduledMessage, messageCreativeId, facebookInfo.fbToken)
        facebookApiCaller('v6.0', `${scheduledMessage.adAccountId}/ads`, 'post', adPayload)
          .then(adsResp => {
            if (adsResp.body.error) {
              logger.serverLog(TAG, `Error in sending ad to Facebook ${JSON.stringify(adsResp.body)}`, 'error')
              sendOpAlert(adsResp.body.error, 'sponsored messaging controller in kiboengage', '', '', '')
            } else {
              let adId = adsResp.body.id
              let queryObject = { _id: scheduledMessage._id }
              let dataToUpdate = { messageCreativeId, adId, status: 'sent_to_fb', payload: scheduledMessage.payload, adName: scheduledMessage.adName }
              _storeAdAndCreativeIdsExport(queryObject, dataToUpdate)
              _updateClickCountIdExport(scheduledMessage, scheduledMessage._id)
              _sendToClientUsingSocketExport(scheduledMessage, 'Scheduled Sponsored Message is sent. Please refresh to see the changes.')
              facebookApiCaller('v6.0', `${scheduledMessage.adAccountId}/subscribed_apps?app_id=${config.facebook.clientID}`, 'post', {access_token: facebookInfo.fbToken})
                .then(subscriptionResp => {
                  if (subscriptionResp.body.error) {
                    logger.serverLog(TAG, `Error in subscribing to ad insights to Facebook ${JSON.stringify(subscriptionResp.body)}`, 'error')
                    sendOpAlert(subscriptionResp.body.error, 'sponsored messaging controller in kiboengage', '', '', '')
                  } else {
                    logger.serverLog(TAG, 'The scheduled ad is sent to facebook.')
                  }
                })
                .catch(err => {
                  logger.serverLog(TAG, `error on fb call in send ad creatives  ${err}`)
                })
            }
          })
          .catch(err => {
            logger.serverLog(TAG, `error on fb call in get ads  ${err}`)
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `error on fb call in send ad creatives  ${err}`)
    })
}
