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
  let dataToUpdate = { status: payload.status_name, statusFbPayload: payload }
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
      sendToClientUsingSocket(queryObject, dataToUpdate)
    })
    .catch(error => {
      const message = error || 'Error on updating sponsored messaging'
      logger.serverLog(message, `${TAG}: updateSponsoredMessaging`, {queryObject, dataToUpdate}, {}, 'error')
    })
}

function sendToClientUsingSocket (queryObject, dataToUpdate) {
  datalayer.findOneSponsoredMessaging(queryObject)
    .then(sponsoredMessage => {
      if (sponsoredMessage) {
        require('./../../../config/socketio').sendMessageToClient({
          room_id: sponsoredMessage.companyId,
          body: {
            action: 'sponsoredMessaging_statusChanged',
            payload: {
              status: dataToUpdate.status,
              sponsoredMessage
            }
          }
        })
      }
    })
    .catch(error => {
      const message = error || 'Error in fetching sponsored messaging to update client using socket'
      logger.serverLog(message, `${TAG}: sendToClientUsingSocket`, {queryObject, dataToUpdate}, {}, 'error')
    })
}
