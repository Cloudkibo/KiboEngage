/**
 * Created by sojharo on 27/02/2020.
 */

const logger = require('../../../components/logger')
const TAG = 'api/sponsoredMessaging/webhook.controller.js'
const datalayer = require('./sponsoredMessaging.datalayer')

exports.handleAdAccountStatus = function (payload) {
  const { field, value } = payload
  if (field === 'disapproved_ad_objects') {
    handleDisapprovedAdObjects(value)
  } else if (field === 'in_process_ad_objects') {
    handleInProcessAdObjects(value)
  } else if (field === 'with_issues_ad_objects') {
    handleWithIssuesAdObjects(value)
  }
}

function handleDisapprovedAdObjects (payload) {
  const { id, level } = payload
  let queryObject
  let dataToUpdate = { status: 'disapproved', statusFbPayload: payload }
  if (level === 'AD') {
    queryObject = { adId: id }
  } else if (level === 'AD_SET') {
    queryObject = { adSetId: id }
  } else if (level === 'CAMPAIGN') {
    queryObject = { campaignId: id }
  }
  updateSponsoredMessaging(queryObject, dataToUpdate)
}

function handleInProcessAdObjects (payload) {
  const { id, level } = payload
  let queryObject
  let dataToUpdate = { status: 'in_process', statusFbPayload: payload }
  if (level === 'AD') {
    queryObject = { adId: id }
  } else if (level === 'AD_SET') {
    queryObject = { adSetId: id }
  } else if (level === 'CAMPAIGN') {
    queryObject = { campaignId: id }
  } else if (level === 'CREATIVE') {
    queryObject = { messageCreativeId: id }
  }
  updateSponsoredMessaging(queryObject, dataToUpdate)
}

function handleWithIssuesAdObjects (payload) {
  const { id, level } = payload
  let queryObject
  let dataToUpdate = { status: 'with_issues', statusFbPayload: payload }
  if (level === 'AD') {
    queryObject = { adId: id }
  } else if (level === 'AD_SET') {
    queryObject = { adSetId: id }
  } else if (level === 'CAMPAIGN') {
    queryObject = { campaignId: id }
  }
  updateSponsoredMessaging(queryObject, dataToUpdate)
}

function updateSponsoredMessaging (queryObject, dataToUpdate) {
  datalayer.genericUpdateSponsoredMessaging(queryObject, dataToUpdate)
    .then(sponsoredMessage => {
      logger.serverLog(TAG, `Updated sponsored messaging`)
    })
    .catch(error => {
      logger.serverLog(TAG, `Error on updating sponsored messaging ${JSON.stringify(error)}`)
    })
}
