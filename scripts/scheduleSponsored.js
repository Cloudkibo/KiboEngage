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
      const message = err || 'Failed to fetch scheduled sponsored broadcast'
      logger.serverLog(message, `${TAG}: exports.runScheduleSoponsored`, {}, {}, 'error')
    })
}

function startScheduledMessageProcess (scheduledMessage) {
  let user
  utility.callApi(`companyUser/query`, 'post', { role: 'buyer', companyId: scheduledMessage.companyId })
    .then(companyUser => {
      return utility.callApi(`user/query`, 'post', {_id: companyUser.userId})
    })
    .then(userFound => {
      user = userFound
      return utility.callApi(`pages/query`, 'post', {_id: scheduledMessage.pageId})
    }).then(page => {
      scheduledMessage.pageFbId = page[0].pageId
      sendScheduledMessage(scheduledMessage, user[0].facebookInfo)
    })
    .catch(err => {
      const message = err || 'Failed to fetch scheduled sponsored broadcast'
      logger.serverLog(message, `${TAG}: startScheduledMessageProcess`, scheduledMessage, {}, 'error')
    })
}

function sendScheduledMessage (scheduledMessage, facebookInfo) {
  logiclayer.prepareAdCreativePayload(scheduledMessage, facebookInfo.fbToken, (err, creativePayload) => {
    if (err) {
      const message = err || 'Error in preparing Ad Creatives'
      return logger.serverLog(message, `${TAG}: sendScheduledMessage`, scheduledMessage, {}, 'error')
    }
    facebookApiCaller('v6.0', `${scheduledMessage.adAccountId}/adcreatives`, 'post', creativePayload)
      .then(adCreativeResp => {
        if (adCreativeResp.body.error) {
          const message = adCreativeResp.body.error || 'Error in Ad Creatives Create'
          logger.serverLog(message, `${TAG}: sendScheduledMessage`, scheduledMessage, {}, 'error')
          updateForError(scheduledMessage, adCreativeResp.body.error.error_user_msg)
          sendOpAlert(adCreativeResp.body.error, 'sponsored messaging controller in kiboengage', '', '', '')
        } else {
          let messageCreativeId = adCreativeResp.body.id
          let adPayload = logiclayer.prepareAdPayload(scheduledMessage, messageCreativeId, facebookInfo.fbToken)
          facebookApiCaller('v6.0', `${scheduledMessage.adAccountId}/ads`, 'post', adPayload)
            .then(adsResp => {
              if (adsResp.body.error) {
                const message = err || 'Error in sending ad to Facebook'
                logger.serverLog(message, `${TAG}: sendScheduledMessage`, scheduledMessage, {}, 'error')
                updateForError(scheduledMessage, adsResp.body.error.error_user_msg)
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
                      const message = subscriptionResp.body.error || 'Error in subscribing to ad insights to Facebook'
                      logger.serverLog(message, `${TAG}: sendScheduledMessage`, scheduledMessage, {}, 'error')
                      updateForError(scheduledMessage, subscriptionResp.body.error.error_user_msg)
                      sendOpAlert(subscriptionResp.body.error, 'sponsored messaging controller in kiboengage', '', '', '')
                    }
                  })
                  .catch(err => {
                    const message = err || 'error on fb call in send ad creatives'
                    logger.serverLog(message, `${TAG}: sendScheduledMessage`, scheduledMessage, {}, 'error')
                  })
              }
            })
            .catch(err => {
              const message = err || 'error on fb call in get ads'
              logger.serverLog(message, `${TAG}: sendScheduledMessage`, scheduledMessage, {}, 'error')
            })
        }
      })
      .catch(err => {
        const message = err || 'error on fb call in send ad creatives'
        logger.serverLog(message, `${TAG}: sendScheduledMessage`, scheduledMessage, {}, 'error')
      })
  })
}

function updateForError (scheduledMessage, errorMessage) {
  let errorMsg = 'This scheduled broadcast failed due to this reason from facebook: ' + errorMessage
  let queryObject = { _id: scheduledMessage._id }
  let dataToUpdate = { status: 'failed', errorMessage: errorMsg }
  _storeAdAndCreativeIdsExport(queryObject, dataToUpdate)
}
