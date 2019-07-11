const AutopostingMessages = require('./autopostingMessages.datalayer')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/autopostingMessage/autopostingMessage.controller.js'
const async = require('async')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.getMessages = function (req, res) {
  let data = {
    user: req.user,
    autopostingId: req.params.id,
    number_of_records: req.body.number_of_records
  }
  if (req.body.first_page === 'first') {
    data.recordsToSkip = 0
    data.match = {
      companyId: req.user.companyId,
      autopostingId: req.params.id
    }
  } else if (req.body.first_page === 'next') {
    data.recordsToSkip = Math.abs(((req.body.requested_page - 1) - (req.body.current_page))) * req.body.number_of_records
    data.match = {
      companyId: req.user.companyId,
      autopostingId: req.params.id,
      _id: { $lt: req.body.last_id }
    }
  } else if (req.body.first_page === 'previous') {
    data.recordsToSkip = Math.abs(req.body.requested_page * req.body.number_of_records)
    data.match = {
      companyId: req.user.companyId,
      autopostingId: req.params.id,
      _id: { $gt: req.body.last_id }
    }
  }

  async.parallelLimit([
    _countAutopostingMessages.bind(null, data),
    _fetchAutopostingMessages.bind(null, data)
  ], 10, function (err, results) {
    if (err) {
      logger.serverLog(TAG, `Failed to fetch autoposting messages. ${JSON.stringify(err)}`)
      sendErrorResponse(res, 500, '', 'Failed to fetch autoposting messages')
    } else {
      let messagesCount = results[0]
      let autopostingMessages = results[1]
      populatePages(autopostingMessages, req)
        .then(result => {
          let payload = {
            messages: result.messages,
            count: messagesCount.length > 0 ? messagesCount[0].count : 0
          }
          sendSuccessResponse(res, 200, payload)
        })
    }
  })
}

const _countAutopostingMessages = (data, next) => {
  AutopostingMessages.countAutopostingMessagesDocuments(
    {companyId: data.user.companyId, autopostingId: data.autopostingId}
  )
    .then(messagesCount => {
      next(null, messagesCount)
    })
    .catch(err => {
      next(err)
    })
}

const _fetchAutopostingMessages = (data, next) => {
  AutopostingMessages.findAutopostingMessageUsingAggregate(data.match, undefined, undefined, data.number_of_records, { datetime: -1 }, data.recordsToSkip)
    .then(autopostingMessages => {
      next(null, autopostingMessages)
    })
    .catch(err => {
      next(err)
    })
}

function populatePages (messages, req) {
  return new Promise(function (resolve, reject) {
    let sendPayload = []
    if (messages && messages.length > 0) {
      for (let i = 0; i < messages.length; i++) {
        utility.callApi(`pages/query`, 'post', {_id: messages[i].pageId, companyId: messages[i].companyId})
          .then(page => {
            sendPayload.push({
              _id: messages[i]._id,
              autoposting_type: messages[i].autoposting_type,
              clicked: messages[i].clicked,
              companyId: messages[i].companyId,
              datetime: messages[i].datetime,
              message_id: messages[i].message_id ? messages[i].message_id : 0,
              pageId: page[0],
              seen: messages[i].seen,
              sent: messages[i].sent
            })
            if (sendPayload.length === messages.length) {
              sendPayload.sort(function (a, b) {
                return new Date(b.datetime) - new Date(a.datetime)
              })
              resolve({messages: sendPayload})
            }
          })
          .catch(err => {
            reject(err)
          })
      }
    } else {
      resolve({messages: []})
    }
  })
}
