const utility = require('../utility')
const logiclayer = require('./sponsoredMessaging.logiclayer')
const datalayer = require('./sponsoredMessaging.datalayer')
const async = require('async')
const { facebookApiCaller } = require('../../global/facebookApiCaller')
const { marketingApiAccessToken } = require('../../../config/environment')
let { sendOpAlert } = require('./../../global/operationalAlert')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/sponsoredMessaging/sponsoredMessaging.controller.js'
const URLDataLayer = require('../URLForClickedCount/URL.datalayer')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const { kiboengage } = require('../../global/constants').serverConstants

exports.index = function (req, res) {
  var fetchCriteria = logiclayer.fetchSponsoredMessagesCriteria(req.body, req.user.companyId)
  async.parallelLimit([
    function (callback) {
      datalayer.countDocuments(fetchCriteria.countCriteria[0].$match)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
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
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      sendErrorResponse(res, 500, err)
    } else {
      let countResponse = results[0]
      let sponsoredMessages = results[1]
      sendSuccessResponse(res, 200, {sponsoredMessages: sponsoredMessages, count: countResponse.length > 0 ? countResponse[0].count : 0})
    }
  })
}

exports.create = function (req, res) {
  let payload = logiclayer.preparePayload(req.user.companyId, req.user._id, req.body)
  datalayer.createForSponsoredMessaging(payload)
    .then(sponsoredMessage => {
      return res.status(201).json({ status: 'success', payload: sponsoredMessage })
    })
    .catch(error => {
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
          return sendErrorResponse(res, 500, campaignResp.body.error.error_user_msg)
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
              return sendErrorResponse(res, 500, adsetResp.body.error.error_user_msg)
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
  if (!req.body.ad_account_id) {
    return sendErrorResponse(res, 500, {message: 'Ad account id is must. Ad is not sent to facebook.'})
  }
  if (id !== undefined && id !== '') {
    utility.callApi(`sponsoredMessaging/query`, 'get', { _id: id })
      .then(sponsoredMessages => {
        let sponsoredMessage = sponsoredMessages[0]
        updateClickCountId(sponsoredMessage, id)
        let campaignPayload = logiclayer.prepareCampaignPayload(sponsoredMessage, accesstoken)
        facebookApiCaller('v4.0', `act_${req.body.ad_account_id}/campaigns`, 'post', campaignPayload)
          .then(campaignResp => {
            if (campaignResp.body.error) {
              sendOpAlert(campaignResp.body.error, 'sponsored messaging controller in kiboengage', '', req.user._id, req.user.companyId)
              return sendErrorResponse(res, 500, {message: campaignResp.body.error.error_user_msg})
            } else {
              let campaignId = campaignResp.body.id
              let adsetPayload = logiclayer.prepareAdsetPayload(sponsoredMessage, campaignId, accesstoken)
              logger.serverLog(TAG, `adsetPayload ${adsetPayload}`)
              facebookApiCaller('v4.0', `act_${req.body.ad_account_id}/adsets`, 'post', adsetPayload)
                .then(adsetResp => {
                  if (adsetResp.body.error) {
                    sendOpAlert(adsetResp.body.error, 'sponsored messaging controller in kiboengage', '', req.user._id, req.user.companyId)
                    return sendErrorResponse(res, 500, {message: adsetResp.body.error.error_user_msg})
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
                          return sendErrorResponse(res, 500, {message: adCreativeResp.body.error.error_user_msg})
                        } else {
                          logger.serverLog(TAG, `adcreatives ${JSON.stringify(adCreativeResp.body)}`)
                          let messageCreativeId = adCreativeResp.body.id
                          logger.serverLog(TAG, `messageCreativeId ${messageCreativeId}`)
                          let adPayload = logiclayer.prepareadAdPayload(sponsoredMessage, adsetid, messageCreativeId, accesstoken)
                          facebookApiCaller('v4.0', `act_${req.body.ad_account_id}/ads`, 'post', adPayload)
                            .then(adsResp => {
                              if (adsResp.body.error) {
                                sendOpAlert(adsResp.body.error, 'sponsored messaging controller in kiboengage', '', req.user._id, req.user.companyId)
                                return sendErrorResponse(res, 500, {message: adsResp.body.error.error_user_msg})
                              } else {
                                logger.serverLog(TAG, `ads ${JSON.stringify(adsResp.body)}`)
                                let adId = adsResp.body.id
                                logger.serverLog(TAG, `ad_id ${adId}`)

                                sendSuccessResponse(res, 200, {description: 'Your ad is sent to Facebook.'})

                                // NOTE: The following code is breaking the sponsored messages
                                // when we are trying to send the same ad again. This is actually
                                // removing the payload of ad_set_payload and thus, we get undefined
                                // error next time when we send same ad to facebook. This is not clear
                                // why this code was written, therefore, I am not removing the code and
                                // when FAIZAN is back, I will discuss with him. (SOJHARO)

                                // Now since we have got respone from facebook, we shall update our database
                                // let updatePayload = logiclayer.prepareUpdatePayload({ campaign_id: campaignId, ad_id: adId, ad_set_payload: { adset_id: adsetid }, messageCreativeId: messageCreativeId })
                                // utility.callApi(`sponsoredMessaging/${id}`, 'post', updatePayload)
                                //   .then(sponsoredMessage => {
                                //     sendSuccessResponse(res, 200, sponsoredMessage)
                                //   })
                                //   .catch(error => {
                                //     console.log(error)
                                //     return sendErrorResponse(res, 500, error)
                                //   })
                              }
                            })
                            .catch(err => {
                              return sendErrorResponse(res, 500, err)
                            })
                        }
                      })
                      .catch(err => {
                        logger.serverLog(TAG, `error on fb call in send ad creatives  ${err}`)
                        return sendErrorResponse(res, 500, err)
                      })
                  }
                })
                .catch(err => {
                  logger.serverLog(TAG, `error on fb call in send ad sets ${err}`)
                  return sendErrorResponse(res, 500, err)
                })
            }
          })
          .catch(error => {
            logger.serverLog(TAG, `error on fb call in send ad campaigns ${error}`)
            return sendErrorResponse(res, 500, error)
          })
      })
      .catch(error => {
        logger.serverLog(TAG, `error on sponsored messaging query ${error}`)
        return sendErrorResponse(res, 500, error)
      })
  } else {
    return sendErrorResponse(res, 500, {message: 'Failed to send sponsored message due missing account_id'})
  }
}

exports.delete = function (req, res) {
  utility.callApi(`sponsoredMessaging/${req.params._id}`, 'DELETE', {}, kiboengage)
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
        updateClickCountId(sponsoredMessage, id)
        let campaignPayload = logiclayer.prepareCampaignPayload(sponsoredMessage, accesstoken)
        facebookApiCaller('v4.0', `act_${req.body.ad_account_id}/campaigns`, 'post', campaignPayload)
          .then(campaignResp => {
            if (campaignResp.body.error) {
              sendOpAlert(campaignResp.body.error, 'sponsored messaging controller in kiboengage', '', req.user._id, req.user.companyId)
              return sendErrorResponse(res, 500, {message: campaignResp.body.error.error_user_msg})
            } else {
              let campaignId = campaignResp.body.id
              let adsetPayload = logiclayer.prepareAdsetPayload(sponsoredMessage, campaignId, accesstoken)
              logger.serverLog(TAG, `adsetPayload ${adsetPayload}`)
              facebookApiCaller('v4.0', `act_${req.body.ad_account_id}/adsets`, 'post', adsetPayload)
                .then(adsetResp => {
                  if (adsetResp.body.error) {
                    sendOpAlert(adsetResp.body.error, 'sponsored messaging controller in kiboengage', '', req.user._id, req.user.companyId)
                    return sendErrorResponse(res, 500, {message: adsetResp.body.error.error_user_msg})
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
                          return sendErrorResponse(res, 500, {message: adCreativeResp.body.error.error_user_msg})
                        } else {
                          logger.serverLog(TAG, `adcreatives ${JSON.stringify(adCreativeResp.body)}`)
                          let messageCreativeId = adCreativeResp.body.id
                          logger.serverLog(TAG, `messageCreativeId ${messageCreativeId}`)
                          let adPayload = logiclayer.prepareadAdPayload(sponsoredMessage, adsetid, messageCreativeId, accesstoken)
                          facebookApiCaller('v4.0', `act_${req.body.ad_account_id}/ads`, 'post', adPayload)
                            .then(adsResp => {
                              if (adsResp.body.error) {
                                sendOpAlert(adsResp.body.error, 'sponsored messaging controller in kiboengage', '', req.user._id, req.user.companyId)
                                return sendErrorResponse(res, 500, {message: adsResp.body.error.error_user_msg})
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
      return sendErrorResponse(res, 500, error)
    })
}

exports.fetchAdSets = function (req, res) {
  let facebookInfo = req.user.facebookInfo
  if (req.user.role !== 'buyer') {
    facebookInfo = req.user.buyerInfo.facebookInfo
  }
  facebookApiCaller('v6.0', `${req.params.ad_campaign_id}/adsets?fields=id,name,start_time,end_time,daily_budget,lifetime_budget&access_token=${facebookInfo.fbToken}`, 'get')
    .then(response => {
      if (response.body.error) {
        sendOpAlert(response.body.error, 'fetching all ad sets of a user', '', req.user._id, req.user.companyId)
        return sendErrorResponse(res, 500, response.body.error)
      }
      return sendSuccessResponse(res, 200, response.body.data)
    })
    .catch(error => {
      return sendErrorResponse(res, 500, error)
    })
}
