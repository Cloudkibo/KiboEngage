let { facebook } = require('../../global/prepareMessageData')

exports.preparePayload = function (companyId, userId) {
  let payload = {
    companyId: companyId,
    userId: userId,
    status: 'draft'
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

exports.prepareCampaignPayload = function (body, access_token) {
  let payload = {
    name: body.campaign_name,
    objective: 'MESSAGES',
    status: 'PAUSED',
    access_token: access_token
  }
  return payload
}

exports.prepareAdsetPayload = function (body, campaign_id, access_token) {
  let budgetAmount = parseInt(body.ad_set_payload.budget.amount, 10)
  let bidAmount = parseInt(body.ad_set_payload.bidAmount, 10)

  let payload = {
    name: body.ad_set_payload.adset_name,
    optimization_goal: 'IMPRESSIONS',
    billing_event: 'IMPRESSIONS',
    bid_amount: bidAmount,
    daily_budget: budgetAmount,
    campaign_id: campaign_id,
    targeting: {
      publisher_platforms: ['messenger'],
      messenger_positions: ['sponsored_messages'],
      device_platforms: ['mobile', 'desktop']
    },
    status: 'PAUSED',
    promoted_object: {
      page_id: body.pageId
    },
    access_token: access_token
  }
  return payload
}
//     {
//       "message":
//       {
//         "text":"Sample Text",
//         "quick_replies":[{
//           "title":"Quick Reply Text",
//            "content_type":"text"
//           }]
//         }
//       }
// {
//   "message":
//   {
//     "attachment":
//     {
//       "type":"template",
//       "payload":
//       {
//         "template_type":"generic",
//         "elements":[{
//           "title":"Image Text",
//           "buttons":[{
//             "type":"web_url",
//             "title":"button text",
//             "url":"<URL>"
//           }],   
//           "image_hash":"<IMAGE_HASH>"
//         }]
//       }
//     },
//     "text":"Ad text"
//   }
// }

exports.prepareadCreativePayload = function (body, access_token) {
  let data = facebook(body.payload[0])
  data = JSON.parse(data)
  let payload = {
    object_id: body.pageId,
    object_type: 'SHARE',
    messenger_sponsored_message: {message: data},
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
    fields: { name, insights },
    access_token: access_token
  }
  return payload
}
