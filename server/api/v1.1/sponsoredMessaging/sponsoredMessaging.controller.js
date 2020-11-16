const utility = require('../utility')
const logiclayer = require('./sponsoredMessaging.logiclayer')
const datalayer = require('./sponsoredMessaging.datalayer')
const async = require('async')
const { facebookApiCaller } = require('../../global/facebookApiCaller')
let { sendOpAlert } = require('./../../global/operationalAlert')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/sponsoredMessaging/sponsoredMessaging.controller.js'
const URLDataLayer = require('../URLForClickedCount/URL.datalayer')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const { kiboengage } = require('../../global/constants').serverConstants
const config = require('./../../../config/environment')
const { updateCompanyUsage } = require('../../global/billingPricing')

exports.index = function (req, res) {
  let facebookInfo = req.user.facebookInfo
  if (req.user.role !== 'buyer') {
    facebookInfo = req.user.buyerInfo.facebookInfo
  }
  var fetchCriteria = logiclayer.fetchSponsoredMessagesCriteria(req.body, req.user.companyId)
  async.parallelLimit([
    function (callback) {
      datalayer.countDocuments(fetchCriteria.countCriteria[0].$match)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
          callback(err)
        })
    },
    function (callback) {
      let match = fetchCriteria.finalCriteria[0].$match
      let sort = fetchCriteria.finalCriteria[1].$sort
      let skip = fetchCriteria.finalCriteria[2].$skip
      let limit = fetchCriteria.finalCriteria[3].$limit
      datalayer.aggregateForSponsoredMessaging(match, null, null, limit, sort, skip)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
          callback(err)
        })
    }
  ], 10, async function (err, results) {
    if (err) {
      sendErrorResponse(res, 500, err)
    } else {
      let countResponse = results[0]
      let sponsoredMessages = results[1]
      let permissionsGiven = await logiclayer.checkFacebookPermissions(facebookInfo)
      sendSuccessResponse(res, 200, {sponsoredMessages: sponsoredMessages, count: countResponse.length > 0 ? countResponse[0].count : 0, permissionsGiven})
    }
  })
}

exports.create = function (req, res) {
  let payload = logiclayer.preparePayload(req.user.companyId, req.user._id, req.body)
  datalayer.createForSponsoredMessaging(payload)
    .then(sponsoredMessage => {
      updateCompanyUsage(req.user.companyId, 'sponsored_broadcasts', 1)
      return res.status(201).json({ status: 'success', payload: sponsoredMessage })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
      return res.status(500).json({ status: 'failed', payload: `Failed to create sponsored message ${JSON.stringify(error)}` })
    })
}

exports.update = function (req, res) {
  let dataToUpdate = req.body
  datalayer.genericUpdateSponsoredMessaging({_id: req.params.id}, dataToUpdate)
    .then(sponsoredMessage => {
      return res.status(201).json({ status: 'success', payload: sponsoredMessage })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.update`, req.body, {user: req.user}, 'error')
      return res.status(500).json({ status: 'failed', payload: `Failed to create sponsored message ${JSON.stringify(error)}` })
    })
}

exports.campaigns = function (req, res) {
  let facebookInfo = req.user.facebookInfo
  if (req.user.role !== 'buyer') {
    facebookInfo = req.user.buyerInfo.facebookInfo
  }
  let queryObject = { _id: req.body._id }
  if (req.body.type === 'existing') {
    let dataToUpdate = { campaignId: req.body.id }
    _storeCampaignId(queryObject, dataToUpdate, res)
  } else {
    let campaignPayload = logiclayer.prepareCampaignPayload(req.body, facebookInfo.fbToken)
    facebookApiCaller('v6.0', `${req.body.adAccountId}/campaigns`, 'post', campaignPayload)
      .then(campaignResp => {
        if (campaignResp.body.error) {
          sendOpAlert(campaignResp.body.error, 'creating campaign on fb in sponsored in kiboengage', '', req.user._id, req.user.companyId)
          let errMessage = campaignResp.body.error.error_user_msg ? campaignResp.body.error.error_user_msg : campaignResp.body.error.message
          return sendErrorResponse(res, 500, errMessage)
        } else {
          let dataToUpdate = { campaignId: campaignResp.body.id }
          _storeCampaignId(queryObject, dataToUpdate, res)
        }
      })
  }
}

function _storeCampaignId (queryObject, dataToUpdate, res) {
  datalayer.genericUpdateSponsoredMessaging(queryObject, dataToUpdate)
    .then(sponsoredMessage => {
      return res.status(201).json({ status: 'success', payload: dataToUpdate.campaignId })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _storeCampaignId`, {queryObject, dataToUpdate}, {}, 'error')
      return res.status(500).json({ status: 'failed', payload: `Failed to create sponsored message ${JSON.stringify(error)}` })
    })
}

exports.adSets = function (req, res) {
  let facebookInfo = req.user.facebookInfo
  if (req.user.role !== 'buyer') {
    facebookInfo = req.user.buyerInfo.facebookInfo
  }
  let queryObject = { _id: req.body._id }
  if (req.body.type === 'existing') {
    let dataToUpdate = { adSetId: req.body.id }
    _storeAdSetId(queryObject, dataToUpdate, res)
  } else {
    let query = {
      purpose: 'findOne',
      match: { _id: req.body._id }
    }
    utility.callApi(`sponsoredMessaging/query`, 'post', query, kiboengage)
      .then(sponsoredMessage => {
        let adsetPayload = logiclayer.prepareAdsetPayload(req.body, facebookInfo.fbToken)
        facebookApiCaller('v6.0', `${sponsoredMessage.adAccountId}/adsets`, 'post', adsetPayload)
          .then(adsetResp => {
            if (adsetResp.body.error) {
              sendOpAlert(adsetResp.body.error, 'sponsored messaging controller in kiboengage', '', req.user._id, req.user.companyId)
              let errMessage = adsetResp.body.error.error_user_msg ? adsetResp.body.error.error_user_msg : adsetResp.body.error.message
              return sendErrorResponse(res, 500, errMessage)
            } else {
              let dataToUpdate = { adSetId: adsetResp.body.id }
              _storeAdSetId(queryObject, dataToUpdate, res)
            }
          })
      })
  }
}

function _storeAdSetId (queryObject, dataToUpdate, res) {
  datalayer.genericUpdateSponsoredMessaging(queryObject, dataToUpdate)
    .then(sponsoredMessage => {
      return res.status(201).json({ status: 'success', payload: dataToUpdate.adSetId })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _storeAdSetId`, {queryObject, dataToUpdate}, {}, 'error')
      return res.status(500).json({ status: 'failed', payload: `Failed to create sponsored message ${JSON.stringify(error)}` })
    })
}

function _updateClickCountId (payload, sponsoredMessageID) {
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
              URLObject.module = module
              URLDataLayer.updateOneURL(URLObject._id, {'module': module})
                .then(savedurl => {
                })
                .catch(err => {
                  const message = err || 'Failed to update url'
                  logger.serverLog(message, `${TAG}: _updateClickCountId`, {payload, sponsoredMessageID}, {}, 'error')
                })
            })
            .catch(err => {
              const message = err || 'Failed to fetch URL object'
              logger.serverLog(message, `${TAG}: _updateClickCountId`, {payload, sponsoredMessageID}, {}, 'error')
            })
        }
      })
    }
  }
}

exports.send = function (req, res) {
  let facebookInfo = req.user.facebookInfo
  if (req.user.role !== 'buyer') {
    facebookInfo = req.user.buyerInfo.facebookInfo
  }
  logiclayer.prepareAdCreativePayload(req.body, facebookInfo.fbToken, (err, creativePayload) => {
    if (err) {
      const message = err || 'Error in preparing Ad Creatives'
      logger.serverLog(message, `${TAG}: _updateClickCountId`, req.body, {user: req.user}, 'error')
    }
    facebookApiCaller('v6.0', `${req.body.adAccountId}/adcreatives`, 'post', creativePayload)
      .then(adCreativeResp => {
        if (adCreativeResp.body.error) {
          sendOpAlert(adCreativeResp.body.error, 'sponsored messaging controller in kiboengage', '', req.user._id, req.user.companyId)
          let errMessage = adCreativeResp.body.error.error_user_msg ? adCreativeResp.body.error.error_user_msg : adCreativeResp.body.error.message
          return sendErrorResponse(res, 500, errMessage)
        } else {
          let messageCreativeId = adCreativeResp.body.id
          let adPayload = logiclayer.prepareAdPayload(req.body, messageCreativeId, facebookInfo.fbToken)
          facebookApiCaller('v6.0', `${req.body.adAccountId}/ads`, 'post', adPayload)
            .then(adsResp => {
              if (adsResp.body.error) {
                sendOpAlert(adsResp.body.error, 'sponsored messaging controller in kiboengage', '', req.user._id, req.user.companyId)
                let errMessage = adsResp.body.error.error_user_msg ? adsResp.body.error.error_user_msg : adsResp.body.error.message
                return sendErrorResponse(res, 500, errMessage)
              } else {
                let adId = adsResp.body.id
                let queryObject = { _id: req.params.id }
                let dataToUpdate = { messageCreativeId, adId, status: 'sent_to_fb', payload: req.body.payload, adName: req.body.adName }
                _storeAdAndCreativeIds(queryObject, dataToUpdate)
                _updateClickCountId(req.body, req.body._id)
                _sendToClientUsingSocket(req.body, `${req.user.name} has created a new sponsored broadcast. Please refresh to see changes.`)
                facebookApiCaller('v6.0', `${req.body.adAccountId}/subscribed_apps?app_id=${config.facebook.clientID}`, 'post', {access_token: facebookInfo.fbToken})
                  .then(subscriptionResp => {
                    if (subscriptionResp.body.error) {
                      sendOpAlert(subscriptionResp.body.error, 'sponsored messaging controller in kiboengage', '', req.user._id, req.user.companyId)
                      let errMessage = subscriptionResp.body.error.error_user_msg ? subscriptionResp.body.error.error_user_msg : subscriptionResp.body.error.message
                      return sendErrorResponse(res, 500, errMessage)
                    } else {
                      sendSuccessResponse(res, 200, {description: 'Your ad is successfully sent to Facebook.'})
                    }
                  })
                  .catch(err => {
                    const message = err || 'Internal Server Error'
                    logger.serverLog(message, `${TAG}: exports.send`, req.body, {user: req.user}, 'error')
                    return sendErrorResponse(res, 500, err)
                  })
              }
            })
            .catch(err => {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.send`, req.body, {user: req.user}, 'error')
              return sendErrorResponse(res, 500, err)
            })
        }
      })
      .catch(err => {
        const message = err || 'error on fb call in send ad creatives'
        logger.serverLog(message, `${TAG}: _updateClickCountId`, req.body, {user: req.user}, 'error')
        return sendErrorResponse(res, 500, err)
      })
  })
}

function _storeAdAndCreativeIds (queryObject, dataToUpdate) {
  datalayer.genericUpdateSponsoredMessaging(queryObject, dataToUpdate)
    .then(sponsoredMessage => {
    })
    .catch(error => {
      const message = error || 'Error on updating sponsored messaging'
      logger.serverLog(message, `${TAG}: _storeAdAndCreativeIds`, {queryObject, dataToUpdate}, {}, 'error')
    })
}

function _sendToClientUsingSocket (body, message) {
  body.status = 'sent_to_fb'
  require('./../../../config/socketio').sendMessageToClient({
    room_id: body.companyId,
    body: {
      action: 'sponsoredMessaging_newCreated',
      payload: {
        sponsoredMessage: body,
        message: message
      }
    }
  })
}

exports.delete = function (req, res) {
  datalayer.deleteForSponsoredMessaging({ _id: req.params.id })
    .then(sponsoredMessage => {
      updateCompanyUsage(req.user.companyId, 'sponsored_broadcasts', -1)
      return res.status(201).json({ status: 'success', payload: sponsoredMessage })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.delete`, req.body, {user: req.user}, 'error')
      return res.status(500).json({ status: 'failed', payload: `Failed to delete sponsored message ${error}` })
    })
}

exports.getInsight = function (req, res) {
  let adId = req.params.ad_id
  let facebookInfo = req.user.facebookInfo
  if (req.user.role !== 'buyer') {
    facebookInfo = req.user.buyerInfo.facebookInfo
  }
  if (adId !== undefined && adId !== '') {
    facebookApiCaller('v6.0', `${adId}/insights?fields=impressions,ad_name,reach,clicks,spend,date_start,date_stop,unique_clicks,cpm,cpp,ctr,cpc,account_currency&access_token=${facebookInfo.fbToken}`, 'get', {})
      .then(response => {
        if (response.body.error) {
          sendOpAlert(response.body.error, 'sponsored messaging controller in kiboengage', '', req.user._id, req.user.companyId)
          return sendErrorResponse(res, 500, response.body.error)
        } else {
          sendSuccessResponse(res, 200, response.body.data)
        }
      })
      .catch(error => {
        const message = error || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.getInsight`, req.body, {user: req.user}, 'error')
        return sendErrorResponse(res, 500, error)
      })
  }
}

exports.sendInSandbox = function (req, res) {
  const accesstoken = req.body.fbToken
  let id = req.params.id
  req.user = {_id: 'testAPI', companyId: 'testAPI'}
  if (!req.body.ad_account_id) {
    return sendErrorResponse(res, 500, {message: 'Ad account id is must. Ad is not sent to facebook.'})
  }
  if (id !== undefined && id !== '') {
    utility.callApi(`sponsoredMessaging/query`, 'get', { _id: id })
      .then(sponsoredMessages => {
        let sponsoredMessage = sponsoredMessages[0]
        _updateClickCountId(sponsoredMessage, id)
        let campaignPayload = logiclayer.prepareCampaignPayload(sponsoredMessage, accesstoken)
        facebookApiCaller('v4.0', `act_${req.body.ad_account_id}/campaigns`, 'post', campaignPayload)
          .then(campaignResp => {
            if (campaignResp.body.error) {
              sendOpAlert(campaignResp.body.error, 'sponsored messaging controller in kiboengage', '', req.user._id, req.user.companyId)
              return sendErrorResponse(res, 500, {message: campaignResp.body.error.error_user_msg})
            } else {
              let campaignId = campaignResp.body.id
              let adsetPayload = logiclayer.prepareAdsetPayload(sponsoredMessage, campaignId, accesstoken)
              facebookApiCaller('v4.0', `act_${req.body.ad_account_id}/adsets`, 'post', adsetPayload)
                .then(adsetResp => {
                  if (adsetResp.body.error) {
                    sendOpAlert(adsetResp.body.error, 'sponsored messaging controller in kiboengage', '', req.user._id, req.user.companyId)
                    return sendErrorResponse(res, 500, {message: adsetResp.body.error.error_user_msg})
                  } else {
                    let adsetid = adsetResp.body.id
                    let creativePayload = logiclayer.prepareadCreativePayload(sponsoredMessage, accesstoken)
                    facebookApiCaller('v4.0', `act_${req.body.ad_account_id}/adcreatives`, 'post', creativePayload)
                      .then(adCreativeResp => {
                        if (adCreativeResp.body.error) {
                          sendOpAlert(adCreativeResp.body.error, 'sponsored messaging controller in kiboengage', '', req.user._id, req.user.companyId)
                          return sendErrorResponse(res, 500, {message: adCreativeResp.body.error.error_user_msg})
                        } else {
                          let messageCreativeId = adCreativeResp.body.id
                          let adPayload = logiclayer.prepareadAdPayload(sponsoredMessage, adsetid, messageCreativeId, accesstoken)
                          facebookApiCaller('v4.0', `act_${req.body.ad_account_id}/ads`, 'post', adPayload)
                            .then(adsResp => {
                              if (adsResp.body.error) {
                                sendOpAlert(adsResp.body.error, 'sponsored messaging controller in kiboengage', '', req.user._id, req.user.companyId)
                                return sendErrorResponse(res, 500, {message: adsResp.body.error.error_user_msg})
                              } else {
                                let adId = adsResp.body.id
                                // Now since we have got respone from facebook, we shall update our database
                                let updatePayload = logiclayer.prepareUpdatePayload({ campaign_id: campaignId, ad_id: adId, ad_set_payload: { adset_id: adsetid }, messageCreativeId: messageCreativeId })
                                utility.callApi(`sponsoredMessaging/${id}`, 'post', updatePayload)
                                  .then(sponsoredMessage => {
                                    sendSuccessResponse(res, 200, sponsoredMessage)
                                  })
                                  .catch(error => {
                                    const message = error || 'Internal Server Error'
                                    logger.serverLog(message, `${TAG}: exports.sendInSandbox`, req.body, {user: req.user}, 'error')
                                    return sendErrorResponse(res, 500, error)
                                  })
                              }
                            })
                            .catch(err => {
                              const message = err || 'Internal Server Error'
                              logger.serverLog(message, `${TAG}: exports.sendInSandbox`, req.body, {user: req.user}, 'error')
                              return sendErrorResponse(res, 500, err)
                            })
                        }
                      })
                      .catch(err => {
                        const message = err || 'Internal Server Error'
                        logger.serverLog(message, `${TAG}: exports.sendInSandbox`, req.body, {user: req.user}, 'error')
                        return sendErrorResponse(res, 500, err)
                      })
                  }
                })
                .catch(err => {
                  const message = err || 'Internal Server Error'
                  logger.serverLog(message, `${TAG}: exports.sendInSandbox`, req.body, {user: req.user}, 'error')
                  return sendErrorResponse(res, 500, err)
                })
            }
          })
          .catch(error => {
            const message = error || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: exports.sendInSandbox`, req.body, {user: req.user}, 'error')
            return sendErrorResponse(res, 500, error)
          })
      })
      .catch(error => {
        const message = error || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.sendInSandbox`, req.body, {user: req.user}, 'error')
        return sendErrorResponse(res, 500, error)
      })
  } else {
    return sendErrorResponse(res, 400, {message: 'Failed to send sponsored message due missing account_id'})
  }
}

exports.adAccounts = function (req, res) {
  let facebookInfo = req.user.facebookInfo
  if (req.user.role !== 'buyer') {
    facebookInfo = req.user.buyerInfo.facebookInfo
  }
  facebookApiCaller('v6.0', `${facebookInfo.fbId}/adaccounts?fields=name,account_id,id,currency,account_status&access_token=${facebookInfo.fbToken}`, 'get')
    .then(response => {
      if (response.body.error) {
        sendOpAlert(response.body.error, 'fetching all ad accounts of a user', '', req.user._id, req.user.companyId)
        return sendErrorResponse(res, 500, response.body.error)
      }
      return sendSuccessResponse(res, 200, response.body.data)
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.adAccounts`, req.body, {user: req.user}, 'error')
      return sendErrorResponse(res, 500, error)
    })
}

exports.fetchCampaigns = function (req, res) {
  let facebookInfo = req.user.facebookInfo
  if (req.user.role !== 'buyer') {
    facebookInfo = req.user.buyerInfo.facebookInfo
  }
  facebookApiCaller('v6.0', `${req.params.ad_account_id}/campaigns?fields=name,id,status&access_token=${facebookInfo.fbToken}`, 'get')
    .then(response => {
      if (response.body.error) {
        sendOpAlert(response.body.error, 'fetching all ad campaigns of a user', '', req.user._id, req.user.companyId)
        return sendErrorResponse(res, 500, response.body.error)
      }
      return sendSuccessResponse(res, 200, response.body.data)
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.fetchCampaigns`, req.body, {user: req.user}, 'error')
      return sendErrorResponse(res, 500, error)
    })
}

exports.fetchAdSets = function (req, res) {
  let facebookInfo = req.user.facebookInfo
  if (req.user.role !== 'buyer') {
    facebookInfo = req.user.buyerInfo.facebookInfo
  }
  facebookApiCaller('v6.0', `${req.params.ad_campaign_id}/adsets?fields=id,name,start_time,end_time,daily_budget,lifetime_budget,optimization_goal,billing_event,campaign_id,targeting,status,promoted_object&access_token=${facebookInfo.fbToken}`, 'get')
    .then(response => {
      if (response.body.error) {
        const message = response.body.error || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.fetchAdSets`, req.body, {user: req.user}, 'error')
        return sendErrorResponse(res, 500, response.body.error)
      }
      return sendSuccessResponse(res, 200, response.body.data)
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.fetchAdSets`, req.body, {user: req.user}, 'error')
      return sendErrorResponse(res, 500, error)
    })
}

exports._storeAdAndCreativeIdsExport = _storeAdAndCreativeIds
exports._updateClickCountIdExport = _updateClickCountId
exports._sendToClientUsingSocketExport = _sendToClientUsingSocket
