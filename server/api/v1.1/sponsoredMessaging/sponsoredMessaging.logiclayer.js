let { facebook } = require('../../global/prepareMessageData')
let config = require('./../../../config/environment')
let PassportFacebookExtension = require('passport-facebook-extension')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/sponsoredMessaging/sponsoredMessaging.logiclayer.js'

exports.checkFacebookPermissions = async function (facebookInfo) {
  let FBExtension = new PassportFacebookExtension(config.facebook.clientID,
    config.facebook.clientSecret)
  let adsReadPermissionGiven = false
  let adsManagementPermissionGiven = false

  let permissions = await FBExtension.permissionsGiven(facebookInfo.fbId, facebookInfo.fbToken)
  for (let i = 0; i < permissions.length; i++) {
    if (permissions[i].permission === 'ads_management') {
      if (permissions[i].status === 'granted') {
        adsManagementPermissionGiven = true
      }
    }
    if (permissions[i].permission === 'ads_read') {
      if (permissions[i].status === 'granted') {
        adsReadPermissionGiven = true
      }
    }
  }
  return (adsManagementPermissionGiven && adsReadPermissionGiven)
}

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
    special_ad_category: 'NONE',
    access_token: accessToken
  }
  return payload
}

exports.prepareAdsetPayload = function (body, accessToken) {
  let offSetValue = currencyCodes.filter(cc => cc.Code === body.currency)[0].Offset
  let budgetAmount = parseInt(body.budgetAmount, 10) * offSetValue
  let bidAmount = parseInt(body.bidAmount, 10) * offSetValue
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
      page_id: body.pageId
    },
    access_token: accessToken
  }
  if (body.budgetType === 'daily_budget') {
    payload.daily_budget = budgetAmount
  } else if (body.budgetType === 'lifetime_budget') {
    payload.lifetime_budget = budgetAmount
  }
  return payload
}

exports.prepareAdCreativePayload = function (body, accessToken) {
  let data = facebook(body.payload[0])
  data = JSON.parse(data)
  let payload = {
    object_id: body.pageFbId,
    object_type: 'SHARE',
    messenger_sponsored_message: JSON.stringify({message: data}),
    access_token: accessToken
  }
  return payload
}

exports.prepareAdPayload = function (body, messageCreativeId, accessToken) {
  let payload = {
    name: body.adName,
    adset_id: body.adSetId,
    creative: {
      creative_id: messageCreativeId
    },
    status: 'ACTIVE',
    access_token: accessToken
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

exports.fetchSponsoredMessagesCriteria = function (body, companyId) {
  let finalCriteria = {}
  let countCriteria = {}
  let recordsToSkip = 0
  let searchRegex = '.*' + body.search_value + '.*'
  let findCriteria = {
    companyId: companyId,
    adName: body.search_value !== '' ? { $regex: searchRegex, $options: 'i' } : { $exists: true }
  }
  if (body.status_value !== '') {
    findCriteria['status'] = body.status_value
  }
  if (body.page_value !== '') {
    findCriteria['pageId'] = body.page_value
  }
  if (body.first_page === 'first') {
    finalCriteria = [
      { $match: findCriteria },
      { $sort: { createdAt: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'next') {
    recordsToSkip = Math.abs(((body.requested_page - 1) - (body.current_page))) * body.number_of_records
    let finalFindCriteria = {}
    Object.assign(finalFindCriteria, findCriteria)
    finalFindCriteria._id = { $lt: body.last_id }
    finalCriteria = [
      { $match: finalFindCriteria },
      { $sort: { createdAt: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  } else if (body.first_page === 'previous') {
    recordsToSkip = Math.abs(body.requested_page * body.number_of_records)
    let finalFindCriteria = {}
    Object.assign(finalFindCriteria, findCriteria)
    finalFindCriteria._id = { $gt: body.last_id }
    finalCriteria = [
      { $match: finalFindCriteria },
      { $sort: { createdAt: -1 } },
      { $skip: recordsToSkip },
      { $limit: body.number_of_records }
    ]
  }
  countCriteria = [
    { $match: findCriteria },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]
  return {
    finalCriteria,
    countCriteria
  }
}

let currencyCodes = [
  {
    'Name': 'Algerian Dinar',
    'Code': 'DZD',
    'Offset': 100
  },
  {
    'Name': 'Argentine Peso',
    'Code': 'ARS',
    'Offset': 100
  },
  {
    'Name': 'Australian Dollar',
    'Code': 'AUD',
    'Offset': 100
  },
  {
    'Name': 'Bangladeshi Taka',
    'Code': 'BDT',
    'Offset': 100
  },
  {
    'Name': 'Bolivian Boliviano',
    'Code': 'BOB',
    'Offset': 100
  },
  {
    'Name': 'Brazilian Real',
    'Code': 'BRL',
    'Offset': 100
  },
  {
    'Name': 'British Pound',
    'Code': 'GBP',
    'Offset': 100
  },
  {
    'Name': 'Canadian Dollar',
    'Code': 'CAD',
    'Offset': 100
  },
  {
    'Name': 'Chilean Peso',
    'Code': 'CLP',
    'Offset': 1
  },
  {
    'Name': 'Chinese Yuan',
    'Code': 'CNY',
    'Offset': 100
  },
  {
    'Name': 'Colombian Peso',
    'Code': 'COP',
    'Offset': 1
  },
  {
    'Name': 'Costa Rican Colon',
    'Code': 'CRC',
    'Offset': 1
  },
  {
    'Name': 'Czech Koruna',
    'Code': 'CZK',
    'Offset': 100
  },
  {
    'Name': 'Danish Krone',
    'Code': 'DKK',
    'Offset': 100
  },
  {
    'Name': 'Egyptian Pounds',
    'Code': 'EGP',
    'Offset': 100
  },
  {
    'Name': 'Euro',
    'Code': 'EUR',
    'Offset': 100
  },
  {
    'Name': 'Guatemalan Quetza',
    'Code': 'GTQ',
    'Offset': 100
  },
  {
    'Name': 'Honduran Lempira',
    'Code': 'HNL',
    'Offset': 100
  },
  {
    'Name': 'Hong Kong Dollar',
    'Code': 'HKD',
    'Offset': 100
  },
  {
    'Name': 'Hungarian Forint',
    'Code': 'HUF',
    'Offset': 1
  },
  {
    'Name': 'Iceland Krona',
    'Code': 'ISK',
    'Offset': 1
  },
  {
    'Name': 'Indian Rupee',
    'Code': 'INR',
    'Offset': 100
  },
  {
    'Name': 'Indonesian Rupiah',
    'Code': 'IDR',
    'Offset': 1
  },
  {
    'Name': 'Israeli New Shekel',
    'Code': 'ILS',
    'Offset': 100
  },
  {
    'Name': 'Japanese Yen',
    'Code': 'JPY',
    'Offset': 1
  },
  {
    'Name': 'Kenyan Shilling',
    'Code': 'KES',
    'Offset': 100
  },
  {
    'Name': 'Korean Won',
    'Code': 'KRW',
    'Offset': 1
  },
  {
    'Name': 'Macau Patacas',
    'Code': 'MOP',
    'Offset': 100
  },
  {
    'Name': 'Malaysian Ringgit',
    'Code': 'MYR',
    'Offset': 100
  },
  {
    'Name': 'Mexican Peso',
    'Code': 'MXN',
    'Offset': 100
  },
  {
    'Name': 'New Zealand Dollar',
    'Code': 'NZD',
    'Offset': 100
  },
  {
    'Name': 'Nicaraguan Cordoba',
    'Code': 'NIO',
    'Offset': 100
  },
  {
    'Name': 'Nigerian Naira',
    'Code': 'NGN',
    'Offset': 100
  },
  {
    'Name': 'Norwegian Krone',
    'Code': 'NOK',
    'Offset': 100
  },
  {
    'Name': 'Pakistani Rupee',
    'Code': 'PKR',
    'Offset': 100
  },
  {
    'Name': 'Paraguayan Guarani',
    'Code': 'PYG',
    'Offset': 1
  },
  {
    'Name': 'Peruvian Nuevo Sol',
    'Code': 'PEN',
    'Offset': 100
  },
  {
    'Name': 'Philippine Peso',
    'Code': 'PHP',
    'Offset': 100
  },
  {
    'Name': 'Polish Zloty',
    'Code': 'PLN',
    'Offset': 100
  },
  {
    'Name': 'Qatari Rials',
    'Code': 'QAR',
    'Offset': 100
  },
  {
    'Name': 'Romanian Leu',
    'Code': 'RON',
    'Offset': 100
  },
  {
    'Name': 'Russian Ruble',
    'Code': 'RUB',
    'Offset': 100
  },
  {
    'Name': 'Saudi Arabian Riyal',
    'Code': 'SAR',
    'Offset': 100
  },
  {
    'Name': 'Singapore Dollar',
    'Code': 'SGD',
    'Offset': 100
  },
  {
    'Name': 'South African Rand',
    'Code': 'ZAR',
    'Offset': 100
  },
  {
    'Name': 'Swedish Krona',
    'Code': 'SEK',
    'Offset': 100
  },
  {
    'Name': 'Swiss Franc',
    'Code': 'CHF',
    'Offset': 100
  },
  {
    'Name': 'Taiwan Dollar',
    'Code': 'TWD',
    'Offset': 1
  },
  {
    'Name': 'Thai Baht',
    'Code': 'THB',
    'Offset': 100
  },
  {
    'Name': 'Turkish Lira',
    'Code': 'TRY',
    'Offset': 100
  },
  {
    'Name': 'Uae Dirham',
    'Code': 'AED',
    'Offset': 100
  },
  {
    'Name': 'United States Dollar',
    'Code': 'USD',
    'Offset': 100
  },
  {
    'Name': 'Uruguay Peso',
    'Code': 'UYU',
    'Offset': 100
  },
  {
    'Name': 'Venezuelan Bolivar',
    'Code': 'VEF',
    'Offset': 100
  },
  {
    'Name': 'Vietnamese Dong',
    'Code': 'VND',
    'Offset': 1
  }
]
