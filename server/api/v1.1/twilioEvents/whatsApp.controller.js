const logger = require('../../../components/logger')
const TAG = '/api/v1/twilioEvents/controller.js'
const { callApi } = require('../utility')

exports.trackDeliveryWhatsApp = function (req, res) {
  console.log('in body', req.body)
  res.status(200).json({ status: 'success' })
  let query = {}
  if (req.body.SmsStatus === 'delivered' && req.body.EventType === 'DELIVERED') {
    query = {
      purpose: 'updateOne',
      match: {_id: req.params.id},
      updated: {$inc: { sent: 1 }}
    }
  } else if (req.body.MessageStatus === 'read' && req.body.EventType === 'READ') {
    updateChatSeen(req.body)
    query = {
      purpose: 'updateOne',
      match: {_id: req.params.id},
      updated: {$inc: { seen: 1 }}
    }
  }
  if (Object.keys(query).length > 0 && query.constructor === Object) {
    console.log('let query', query)
    callApi(`whatsAppBroadcasts`, 'put', query, 'kiboengage')
      .then(updated => {
      })
      .catch(err => {
        logger.serverLog(TAG, `Failed to update broadcast ${JSON.stringify(err)}`, 'error')
      })
  }
}
function updateChatSeen (body) {
  let from = body.To.substring(9)
  callApi(`companyprofile/query`, 'post', {'twilioWhatsApp.accountSID': body.AccountSid})
    .then(company => {
      callApi(`whatsAppContacts/query`, 'post', {number: from, companyId: company._id})
        .then(contact => {
          contact = contact[0]
          if (contact) {
            let chatQuery = {
              purpose: 'updateAll',
              match: {contactId: contact._id, format: 'kibopush'},
              updated: {$set: {status: 'seen', seenDateTime: Date.now()}}
            }
            console.log('chatQuery', chatQuery)
            callApi(`whatsAppChat`, 'put', chatQuery, 'kibochat')
              .then(updated => {
                console.log('updated after', updated)
              })
              .catch(err => {
                logger.serverLog(TAG, `Failed to update chat seen ${JSON.stringify(err)}`, 'error')
              })
          }
        })
        .catch(error => {
          logger.serverLog(TAG, `Failed to fetch contact ${JSON.stringify(error)}`, 'error')
        })
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to company profile ${JSON.stringify(error)}`, 'error')
    })
}
