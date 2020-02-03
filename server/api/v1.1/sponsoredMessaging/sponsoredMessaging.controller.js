const utility = require('../utility')
const logiclayer = require('./sponsoredMessaging.logiclayer')
const { facebookApiCaller } = require('../../global/facebookApiCaller')
const { marketingApiAccessToken } = require('../../../config/environment')
let { sendOpAlert } = require('./../../global/operationalAlert')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/sponsoredMessaging/sponsoredMessaging.controller.js'
const URLDataLayer = require('../URLForClickedCount/URL.datalayer')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      utility.callApi(`sponsoredmessaging/query`, 'get', { companyId: companyUser.companyId })
        .then(sponsoredMessages => {
          return res.status(200).json({ status: 'success', payload: sponsoredMessages })
        })
        .catch(error => {
          return res.status(500).json({ status: 'failed', payload: `Failed to fetch sponsoredMessages ${JSON.stringify(error)}` })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

exports.create = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }

      let payload = logiclayer.preparePayload(companyUser.companyId, req.user._id, req.body.status)
      utility.callApi(`sponsoredMessaging`, 'post', payload)
        .then(sponsoredMessage => {
          return res.status(201).json({ status: 'success', payload: sponsoredMessage })
        })
        .catch(error => {
          return res.status(500).json({ status: 'failed', payload: `Failed to create sponsored message ${JSON.stringify(error)}` })
        })
    })
}

exports.update = function (req, res) {
  utility.callApi(`sponsoredMessaging/${req.params.id}`, 'post', req.body)
    .then(sponsoredMessage => {
      return res.status(201).json({ status: 'success', payload: sponsoredMessage })
    })
    .catch(error => {
      return res.status(500).json({ status: 'failed', payload: `Failed to create sponsored message ${JSON.stringify(error)}` })
    })
}
function updateClickCountId (payload, sponsoredMessageID) {
  for (let i = 0; i < payload.length; i++) {
    logger.serverLog(TAG, `updateClickCountId ${sponsoredMessageID}`, 'debug')
    for (let i = 0; i < payload.length; i++) {
      if (payload[i].buttons && payload[i].buttons.length > 0) {
        payload[i].buttons.forEach((button) => {
          if (button.url && !button.messenger_extensions) {
            let temp = button.newUrl.split('/')
            let urlId = temp[temp.length - 1]
            URLDataLayer.findOneURL(urlId)
              .then(URLObject => {
                let module = URLObject.module
                module.id = sponsoredMessageID
                logger.serverLog(TAG, `URLDataLayer module ${JSON.stringify(module)}`, 'debug')
                URLObject.module = module
                logger.serverLog(TAG, `URLObject updated module ${JSON.stringify(URLObject)}`, 'debug')
                URLDataLayer.updateOneURL(URLObject._id, {'module': module})
                  .then(savedurl => {
                    logger.serverLog(TAG, `Updated URLObject ${JSON.stringify(savedurl)}`, 'debug')
                  })
                  .catch(err => {
                    logger.serverLog(TAG, `Failed to update url ${JSON.stringify(err)}`, 'error')
                  })
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to fetch URL object ${err}`, 'error')
              })
          }
        })
      }
    }
  }
}

exports.send = function (req, res) {
  const accesstoken = req.user.facebookInfo.fbToken
  let id = req.params.id
  if (id !== undefined && id !== '') {
    utility.callApi(`sponsoredMessaging/query`, 'get', { _id: id })
      .then(sponsoredMessages => {
        let sponsoredMessage = sponsoredMessages[0]
        console.log('sponsoredMessage payload', sponsoredMessage)
        updateClickCountId(sponsoredMessage, id)
        let campaignPayload = logiclayer.prepareCampaignPayload(sponsoredMessage, accesstoken)
        facebookApiCaller('v4.0', `act_${req.body.ad_account_id}/campaigns`, 'post', campaignPayload)
          .then(campaignResp => {
            if (campaignResp.body.error) {
              sendOpAlert(campaignResp.body.error, 'sponsored messaging controller in kiboengage', '', req.user._id, req.user.companyId)
              return sendErrorResponse(res, 500, campaignResp.body.error)
            } else {
              let campaignId = campaignResp.body.id
              let adsetPayload = logiclayer.prepareAdsetPayload(sponsoredMessage, campaignId, accesstoken)
              logger.serverLog(TAG, `adsetPayload ${adsetPayload}`)
              facebookApiCaller('v4.0', `act_${req.body.ad_account_id}/adsets`, 'post', adsetPayload)
                .then(adsetResp => {
                  if (adsetResp.body.error) {
                    sendOpAlert(adsetResp.body.error, 'sponsored messaging controller in kiboengage', '', req.user._id, req.user.companyId)
                    return sendErrorResponse(res, 500, adsetResp.body.error)
                  } else {
                    logger.serverLog(TAG, `adsetsResponse ${JSON.stringify(adsetResp.body)}`)
                    let adsetid = adsetResp.body.id
                    logger.serverLog(TAG, `adsetid ${adsetid}`)
                    let creativePayload = logiclayer.prepareadCreativePayload(sponsoredMessage, accesstoken)
                    logger.serverLog(TAG, `creativePayload ${creativePayload}`)
                    facebookApiCaller('v4.0', `act_${req.body.ad_account_id}/adcreatives`, 'post', creativePayload)
                      .then(adCreativeResp => {
                        if (adCreativeResp.body.error) {
                          sendOpAlert(adCreativeResp.body.error, 'sponsored messaging controller in kiboengage', '', req.user._id, req.user.companyId)
                          return sendErrorResponse(res, 500, adCreativeResp.body.error)
                        } else {
                          logger.serverLog(TAG, `adcreatives ${JSON.stringify(adCreativeResp.body)}`)
                          let messageCreativeId = adCreativeResp.body.id
                          logger.serverLog(TAG, `messageCreativeId ${messageCreativeId}`)
                          let adPayload = logiclayer.prepareadAdPayload(sponsoredMessage, adsetid, messageCreativeId, accesstoken)
                          facebookApiCaller('v4.0', `act_${req.body.ad_account_id}/ads`, 'post', adPayload)
                            .then(adsResp => {
                              if (adsResp.body.error) {
                                sendOpAlert(adsResp.body.error, 'sponsored messaging controller in kiboengage', '', req.user._id, req.user.companyId)
                                return sendErrorResponse(res, 500, adsResp.body.error)
                              } else {
                                logger.serverLog(TAG, `ads ${JSON.stringify(adsResp.body)}`)
                                let adId = adsResp.body.id
                                logger.serverLog(TAG, `ad_id ${adId}`)
                                // Now since we have got respone from facebook, we shall update our database
                                let updatePayload = logiclayer.prepareUpdatePayload({ campaign_id: campaignId, ad_id: adId, ad_set_payload: { adset_id: adsetid }, messageCreativeId: messageCreativeId })
                                utility.callApi(`sponsoredMessaging/${id}`, 'post', updatePayload)
                                  .then(sponsoredMessage => {
                                    sendSuccessResponse(res, 200, sponsoredMessage)
                                  })
                                  .catch(error => {
                                    return sendErrorResponse(res, 500, error)
                                  })
                              }
                            })
                            .catch(err => {
                              return sendErrorResponse(res, 500, err)
                            })
                        }
                      })
                      .catch(err => {
                        return sendErrorResponse(res, 500, err)
                      })
                  }
                })
                .catch(err => {
                  return sendErrorResponse(res, 500, err)
                })
            }
          })
          .catch(error => {
            return sendErrorResponse(res, 500, error)
          })
      })
      .catch(error => {
        return sendErrorResponse(res, 500, error)
      })
  } else {
    return sendErrorResponse(res, 500, {message: 'Failed to send sponsored message due missing account_id'})
  }
}

exports.delete = function (req, res) {
  utility.callApi(`sponsoredMessaging/${req.params._id}`, 'DELETE', {})
    .then(sponsoredMessage => {
      return res.status(201).json({ status: 'success', payload: sponsoredMessage })
    })
    .catch(error => {
      return res.status(500).json({ status: 'failed', payload: `Failed to delete sponsored message ${error}` })
    })
}

exports.getInsight = function (req, res) {
  const accesstoken = marketingApiAccessToken
  let adId = req.params.ad_id

  if (adId !== undefined && adId !== '') {
    let insightPayload = logiclayer.prepareInsightPayload(accesstoken)
    facebookApiCaller(`v4.0/${adId}/insights`, 'post', insightPayload)
      .then(response => {
        if (response.body.error) {
          sendOpAlert(response.body.error, 'sponsored messaging controller in kiboengage', '', req.user._id, req.user.companyId)
        }
        return res.status(200).json({ status: 'success', payload: response })
      })
      .catch(error => {
        return res.status(500).json({ status: 'failed', payload: `Failed to fetch insight of a ad ${JSON.stringify(error)}` })
      })
  }
}
