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
          {companyId: mongoose.Types.ObjectId(companyUser.companyId), autopostingId: mongoose.Types.ObjectId(req.params.id)}
        )
          .then(messagesCount => {
            AutopostingMessages.findAutopostingMessagesUsingQueryWithLimit({companyId: companyUser.companyId, autopostingId: req.params.id}, req.body.number_of_records)
              .then(autopostingMessages => {
                res.status(200).json({
                  status: 'success',
                  payload: {messages: autopostingMessages, count: messagesCount.length > 0 ? messagesCount[0].count : 0}
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
          {companyId: mongoose.Types.ObjectId(companyUser.companyId), autopostingId: mongoose.Types.ObjectId(req.params.id)}
        )
          .then(messagesCount => {
            AutopostingMessages.findAutopostingMessagesUsingQueryWithLimit({companyId: companyUser.companyId, autopostingId: req.params.id, _id: {$gt: req.body.last_id}}, req.body.number_of_records)
              .then(autopostingMessages => {
                res.status(200).json({
                  status: 'success',
                  payload: {messages: autopostingMessages, count: messagesCount.length > 0 ? messagesCount[0].count : 0}
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
          {companyId: mongoose.Types.ObjectId(companyUser.companyId), autopostingId: mongoose.Types.ObjectId(req.params.id)}
        )
          .then(messagesCount => {
            AutopostingMessages.findAutopostingMessagesUsingQueryWithLimit({companyId: companyUser.companyId, autopostingId: req.params.id, _id: {$lt: req.body.last_id}}, req.body.number_of_records)
              .then(autopostingMessages => {
                res.status(200).json({
                  status: 'success',
                  payload: {messages: autopostingMessages, count: messagesCount.length > 0 ? messagesCount[0].count : 0}
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
