const AutopostingMessages = require('./autopostingMessages.datalayer')
const utility = require('../utility')
const mongoose = require('mongoose')

exports.getMessages = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      if (req.body.first_page === 'first') {
        AutopostingMessages.countAutopostingMessagesDocuments(
          {companyId: companyUser.companyId, autopostingId: req.params.id}
        )
          .then(messagesCount => {
            let recordsToSkip = 0
            AutopostingMessages.findAutopostingMessageUsingAggregate({companyId: companyUser.companyId, autopostingId: req.params.id}, undefined, undefined, req.body.number_of_records, { datetime: -1 }, recordsToSkip)
              .then(autopostingMessages => {
                populatePages(autopostingMessages, req)
                  .then(result => {
                    res.status(200).json({
                      status: 'success',
                      payload: {messages: result.messages, count: messagesCount.length > 0 ? messagesCount[0].count : 0}
                    })
                  })
              })
              .catch(err => {
                return res.status(500)
                  .json({status: 'failed', description: `Autoposting query failed ${err}`})
              })
          })
          .catch(err => {
            return res.status(404)
              .json({status: 'failed', description: `Error in fetching autoposting message aggregate object ${err}`})
          })
      } else if (req.body.first_page === 'next') {
        AutopostingMessages.countAutopostingMessagesDocuments(
          {companyId: companyUser.companyId, autopostingId: req.params.id}
        )
          .then(messagesCount => {
            let recordsToSkip = Math.abs(((req.body.requested_page - 1) - (req.body.current_page))) * req.body.number_of_records
            AutopostingMessages.findAutopostingMessageUsingAggregate({companyId: companyUser.companyId, autopostingId: req.params.id, _id: { $lt: mongoose.Types.ObjectId(req.body.last_id) }}, undefined, undefined, req.body.number_of_records, { datetime: -1 }, recordsToSkip)
              .then(autopostingMessages => {
                populatePages(autopostingMessages, req)
                  .then(result => {
                    res.status(200).json({
                      status: 'success',
                      payload: {messages: result.messages, count: messagesCount.length > 0 ? messagesCount[0].count : 0}
                    })
                  })
              })
              .catch(err => {
                return res.status(500)
                  .json({status: 'failed', description: `Autoposting query failed ${err}`})
              })
          })
          .catch(err => {
            return res.status(404)
              .json({status: 'failed', description: `Error in fetching autoposting message aggregate object ${err}`})
          })
      } else if (req.body.first_page === 'previous') {
        AutopostingMessages.countAutopostingMessagesDocuments(
          {companyId: companyUser.companyId, autopostingId: req.params.id}
        )
          .then(messagesCount => {
            let recordsToSkip = Math.abs(req.body.requested_page * req.body.number_of_records)
            AutopostingMessages.findAutopostingMessageUsingAggregate({companyId: companyUser.companyId, autopostingId: req.params.id, _id: { $gt: mongoose.Types.ObjectId(req.body.last_id) }}, undefined, undefined, req.body.number_of_records, { datetime: -1 }, recordsToSkip)
              .then(autopostingMessages => {
                populatePages(autopostingMessages, req)
                  .then(result => {
                    res.status(200).json({
                      status: 'success',
                      payload: {messages: result.messages, count: messagesCount.length > 0 ? messagesCount[0].count : 0}
                    })
                  })
              })
              .catch(err => {
                return res.status(500)
                  .json({status: 'failed', description: `Autoposting query failed ${err}`})
              })
          })
          .catch(err => {
            return res.status(404)
              .json({status: 'failed', description: `Error in fetching autoposting message aggregate object ${err}`})
          })
      }
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    })
}
function populatePages (messages, req) {
  return new Promise(function (resolve, reject) {
    let sendPayload = []
    if (messages && messages.length > 0) {
      for (let i = 0; i < messages.length; i++) {
        utility.callApi(`pages/query`, 'post', {_id: messages[i].pageId, companyId: messages[i].companyId}, req.headers.authorization)
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
