// const logger = require('../../../components/logger')
// const CUSTOMFIELD = 'api/custom_field/custom_field.controller.js'
const callApi = require('../utility')
const logger = require('../../../components/logger')
const TAG = '/api/v1.1/custom_field_subscribers/custom_field_subscriber.controller.js'
const util = require('util')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.setCustomFieldValue = function (req, res) {
  let customFieldResponse = callApi.callApi(
    'custom_fields/query', 'post',
    { purpose: 'findOne', match: { _id: req.body.customFieldId, $or: [{companyId: req.user.companyId}, {default: true}] } }
  )
  let foundSubscriberResponse = (subscriberId) => callApi.callApi(
    `subscribers/${subscriberId}`,
    'get',
    {}
  )
  let customFieldSubscribersRespons = (subscriberId) => callApi.callApi(
    'custom_field_subscribers/query', 'post',
    { purpose: 'findOne', match: { customFieldId: req.body.customFieldId, subscriberId: subscriberId } }
  )

  customFieldResponse.then(foundCustomField => {
  //  logger.serverLog(customField, `Custom Field ${util.inspect(foundCustomField)}`, 'debug')
    if (!foundCustomField) return new Promise((resolve, reject) => { reject(new Error('Custom Field Not Found With Given ID')) })
    else {
      req.body.subscriberIds.forEach((subscriberId, index) => {
        foundSubscriberResponse(subscriberId)
          .then(foundSubscriber => {
            // logger.serverLog(customField, `found subscriber of a page ${util.inspect(foundSubscriber)}`, 'debug')
            if (!foundSubscriber) return new Promise((resolve, reject) => { reject(new Error('Subscriber Not Found With Given ID')) })
            else return customFieldSubscribersRespons(subscriberId)
          })
          .then(foundCustomFieldSubscriber => {
            // logger.serverLog(customField, `Custom Field subscriber ${util.inspect(foundCustomFieldSubscriber)}`, 'debug')
            let subscriberPayload = {
              customFieldId: req.body.customFieldId,
              subscriberId: subscriberId,
              value: req.body.value
            }
            require('./../../../config/socketio').sendMessageToClient({
              room_id: req.user.companyId,
              body: {
                action: 'set_custom_field_value',
                payload: {
                  setCustomField: subscriberPayload
                }
              }
            })
            if (!foundCustomFieldSubscriber) {
              return callApi.callApi('custom_field_subscribers/', 'post', subscriberPayload)
            } else {
              return callApi.callApi('custom_field_subscribers/', 'put',
                { purpose: 'updateOne', match: { customFieldId: req.body.customFieldId, subscriberId: subscriberId }, updated: { value: req.body.value } })
            }
          })
          .then(setCustomFieldValue => {
            if (index === req.body.subscriberIds.length - 1) {
              if (!req.body.user_input) {
                sendSuccessResponse(res, 200, setCustomFieldValue)
              }
            }
          })
          .catch(err => {
            sendErrorResponse(res, 500, '', `Internal Server ${(err)}`)
            const message = err || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: exports.setCustomFieldValue`, req.body, {user: req.user}, 'error')
          })
      })
    }
  })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.setCustomFieldValue`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server ${(err)}`)
    })
}

exports.getCustomFieldSubscriber = function (req, res) {
  callApi.callApi('custom_field_subscribers/query', 'post',
    { purpose: 'findAll', match: {subscriberId: req.params.subscriberId} }
  )
    .then(foundCustomFieldSubscriber => {
      sendSuccessResponse(res, 200, foundCustomFieldSubscriber)
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.getCustomFieldSubscriber`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server ${(err)}`)
    })
}

exports.getCustomFieldSubscribers = function (req, res) {
  console.log('getCustomFieldSubscribers called')

  callApi.callApi('companyuser/query', 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      callApi.callApi('custom_field_subscribers/query', 'post', { purpose: 'findAll', match: { } })
        .then(foundCustomFieldSubscribers => {
          sendSuccessResponse(res, 200, foundCustomFieldSubscribers)
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.getCustomFieldSubscribers`, req.body, {user: req.user}, 'error')
          if (err) {
            sendErrorResponse(res, 500, `Internal Server Error in fetching customFields${JSON.stringify(err)}`)
          }
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.getCustomFieldSubscribers`, req.body, {user: req.user}, 'error')
      if (err) {
        sendErrorResponse(res, 500, `Internal Server Error in fetching customer${JSON.stringify(err)}`)
      }
    })
}
