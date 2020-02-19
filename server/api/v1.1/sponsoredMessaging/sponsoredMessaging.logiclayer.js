let { facebook } = require('../../global/prepareMessageData')

exports.preparePayload = function (companyId, userId, body) {
  let payload = {
    companyId: companyId,
    userId: userId,
    ...body
  }
  return payload
}

exports.prepareUpdatePayload = function (body, campaignId, adsetid) {
  let payload = {
    _id: body._id,
    // payload: body.payload,
    ad_set_payload: body.ad_set_payload,
    campaign_name: body.campaign_name,
    status: body.status,
    pageId: body.pageId,
    statsFromUs: body.statsFromUs
  }

  // if (body.message_creative_id !== null && body.message_creative_id !== ''){
  //     payload.message_creative_id = body.message_creative_id
  // }
  // if (body.ad_id !== null && body.ad_id !== ''){
  //     payload.ad_id = body.ad_id
  // }
  if (campaignId !== null && campaignId !== '') {
    payload.campaign_id = campaignId
  }
  if (adsetid !== null && adsetid !== '') {
    payload.ad_set_payload.adset_id = adsetid
  }

  return payload
}

exports.prepareCampaignPayload = function (body, accessToken) {
  let payload = {
    name: body.name,
    objective: 'MESSAGES',
    status: 'ACTIVE',
    access_token: accessToken
  }
  return payload
}

exports.prepareAdsetPayload = function (body, pageId, accessToken) {
  let budgetAmount = parseInt(body.budgetAmount, 10) // * 100
  let bidAmount = parseInt(body.bidAmount, 10) // * 100
  let genders = [1, 2]
  if (body.targeting.gender === 'male') {
    genders = [1]
  } else if (body.targeting.gender === 'female') {
    genders = [2]
  }
  let payload = {
    name: body.name,
    optimization_goal: 'IMPRESSIONS',
    billing_event: 'IMPRESSIONS',
    bid_amount: bidAmount,
    daily_budget: budgetAmount,
    campaign_id: body.campaignId,
    targeting: {
      publisher_platforms: ['messenger'],
      messenger_positions: ['sponsored_messages'],
      device_platforms: ['mobile', 'desktop'],
      age_min: parseInt(body.targeting.minAge, 10),
      age_max: parseInt(body.targeting.maxAge, 10),
      genders: genders
    },
    status: 'ACTIVE',
    promoted_object: {
      page_id: pageId
    },
    access_token: accessToken
  }
  return payload
}

exports.prepareadCreativePayload = function (body, access_token) {
  let data = facebook(body.payload[0])
  data = JSON.parse(data)
  let payload = {
    object_id: body.pageId,
    object_type: 'SHARE',
    messenger_sponsored_message: JSON.stringify({message: data}),
    access_token: access_token
  }
  console.log('messenger_sponsored_message', payload)
  return payload
}

exports.prepareadAdPayload = function (body, adset_id, message_creative_id, access_token) {
  let payload = {
    name: body.ad_name,
    adset_id: adset_id,
    creative: {
      creative_id: message_creative_id
    },
    status: 'PAUSED',
    access_token: access_token
  }

  return payload
}

exports.prepareInsightPayload = function (access_token) {
  let payload = {
    fields: ['impressions', 'ad_name', 'reach', 'clicks', 'spend', 'date_start', 'date_stop'],
    access_token: access_token
  }
  return payload
}

exports.updateSponsoredMessagePayload = function (queryObject, updated) {
  let query = {
    purpose: 'updateOne',
    match: queryObject,
    updated: updated
  }
  return query
}

exports.updateCampaignIdPayload = function (body) {
  let query = {
    purpose: 'updateOne',
    match: { _id: body._id },
    updated: { campaignId: body.id }
  }
  return query
}

exports.updateAdSetIdPayload = function (body) {
  let query = {
    purpose: 'updateOne',
    match: { _id: body._id },
    updated: { adSetId: body.id }
  }
  return query
}
