'use strict'

const PageAdminSubscriptionsDataLayer = require('./pageadminsubscriptions.datalayer')
const utility = require('../utility')
const logger = require('../../../components/logger')

// Get list of companyprofiles
exports.index = function (req, res) {
  PageAdminSubscriptionsDataLayer.genericFind({userId: req.user._id, companyId: req.user.companyId})
    .then(subscriptionInfo => {
      if (subscriptionInfo.length > 0) {
        for (let i = 0; i < subscriptionInfo.length; i++) {
          utility.callApi(`user/query`, 'post', { _id: subscriptionInfo[i].userId }, req.headers.authorization)
            .then(user => {
              subscriptionInfo[i].userId = user
              if (i === subscriptionInfo.length - 1) {
                return res.status(200)
                  .json({status: 'success', payload: subscriptionInfo})
              }
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `Internal Server Error ${JSON.stringify(err)}`
              })
            })
        }
      } else {
        return res.status(200)
          .json({status: 'success', payload: []})
      }
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    })
}

exports.create = function (req, res) {
  var payload = {
    'companyId': req.body.companyId,
    'userId': req.body.userId,
    'subscriberId': req.body.subscriberId,
    'pageId': req.body.pageId
  }
  PageAdminSubscriptionsDataLayer.create(payload)
    .then(updatedRecord => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: updatedRecord.companyId,
        body: {
          action: 'admin_subscriber',
          payload: {
            subscribed_page: req.body.pageId
          }
        }
      })
      return res.status(200).json({
        status: 'success',
        payload: updatedRecord
      })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    })
}

exports.fetch = function(req, res) {
  PageAdminSubscriptionsDataLayer.genericFind({userId: req.user._id, companyId: req.user.companyId, pageId: req.body.pageId})
    .then(subscriptionInfo => {
      if (subscriptionInfo.length > 0) {
        for (let i = 0; i < subscriptionInfo.length; i++) {
          utility.callApi(`user/query`, 'post', { _id: subscriptionInfo[i].userId }, req.headers.authorization)
            .then(user => {
              //checking
              subscriptionInfo[i].userId = user
              if (i === subscriptionInfo.length - 1) {
                return res.status(200)
                  .json({status: 'success', payload: subscriptionInfo})
              }
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `Internal Server Error ${JSON.stringify(err)}`
              })
            })
        }
      } else {
        return res.status(200)
          .json({status: 'success', payload: []})
      }
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    })
}
