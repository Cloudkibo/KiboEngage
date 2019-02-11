const AutopostingMessages = require('./autopostingMessages.datalayer')
const utility = require('../utility')

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
            AutopostingMessages.findAutopostingMessagesUsingQueryWithLimit({companyId: companyUser.companyId, autopostingId: req.params.id}, req.body.number_of_records)
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
            AutopostingMessages.findAutopostingMessagesUsingQueryWithLimit({companyId: companyUser.companyId, autopostingId: req.params.id, _id: {$gt: req.body.last_id}}, req.body.number_of_records)
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
            AutopostingMessages.findAutopostingMessagesUsingQueryWithLimit({companyId: companyUser.companyId, autopostingId: req.params.id, _id: {$lt: req.body.last_id}}, req.body.number_of_records)
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
    for (let i = 0; i < messages.length; i++) {
      utility.callApi(`pages/query`, 'post', {_id: messages[i].pageId}, req.headers.authorization)
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
            resolve({messages: sendPayload})
          }
        })
        .catch(err => {
          reject(err)
        })
    }
  })
}
