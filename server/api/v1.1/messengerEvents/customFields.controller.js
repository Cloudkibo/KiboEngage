const logger = require('../../../components/logger')
const TAG = 'api/messengerEvents/customFieldsController.controller.js'
const {callApi} = require('../utility')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let resp
  if (req.body.entry[0].messaging[0].message && req.body.entry[0].messaging[0].message.quick_reply) {
    resp = JSON.parse(req.body.entry[0].messaging[0].message.quick_reply.payload)
  } else {
    resp = JSON.parse(req.body.entry[0].messaging[0].postback.payload)
  }
  const sender = req.body.entry[0].messaging[0].sender.id
  const pageId = req.body.entry[0].messaging[0].recipient.id
  callApi(`pages/query`, 'post', { pageId: pageId, connected: true })
    .then(page => {
      page = page[0]
      if (page) {
        callApi(`subscribers/query`, 'post', { pageId: page._id, senderId: sender, companyId: page.companyId })
          .then(subscriber => {
            subscriber = subscriber[0]
            if (subscriber) {
              saveCustomFieldValue(subscriber, resp)
            }
          })
          .catch(err => {
            const message = err || 'Failed to fetch subscriber'
            logger.serverLog(message, `${TAG}: exports.index`, req.body, {}, 'error')
          })
      }
    })
    .catch(err => {
      const message = err || 'Failed to fetch page'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {}, 'error')
    })
}
function saveCustomFieldValue (subscriber, resp) {
  callApi('custom_field_subscribers/query', 'post',
    { purpose: 'findOne', match: { customFieldId: resp.customFieldId, subscriberId: subscriber._id } })
    .then(customFieldSubscriber => {
      console.log('customFieldSubscriber in saveCustomFieldValue controller', customFieldSubscriber)
      if (customFieldSubscriber) {
        let updatePayload = { purpose: 'updateOne', match: { customFieldId: resp.customFieldId, subscriberId: subscriber._id }, updated: { value: resp.customFieldValue } }
        callApi('custom_field_subscribers/', 'put', updatePayload)
          .then(updated => {
            console.log('updated finally', updated)
          })
          .catch(err => {
            const message = err || 'Failed to save custom field value'
            logger.serverLog(message, `${TAG}: saveCustomFieldValue`, {subscriber}, {}, 'error')
          })
      } else {
        let subscribepayload = {
          customFieldId: resp.customFieldId,
          subscriberId: subscriber._id,
          value: resp.customFieldValue
        }
        callApi('custom_field_subscribers/', 'post', subscribepayload)
          .then(customFieldSubscriber => {
          })
          .catch(err => {
            const message = err || 'Failed to save custom field value'
            logger.serverLog(message, `${TAG}: saveCustomFieldValue`, {subscriber}, {}, 'error')
          })
      }
    })
    .catch(err => {
      const message = err || 'Failed to fetch custom field subscriber'
      logger.serverLog(message, `${TAG}: saveCustomFieldValue`, {subscriber}, {}, 'error')
    })
}
