'use strict'

const PageAdminSubscriptionsDataLayer = require('./pageadminsubscriptions.datalayer')
const utility = require('../utility')
const mongoose = require('mongoose')
const logger = require('../../../components/logger')

// Get list of companyprofiles
exports.index = function (req, res) {
  PageAdminSubscriptionsDataLayer.genericFind({userId: req.user._id})
    .then(subscriptionInfo => {
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
    'companyId': mongoose.Types.ObjectId(req.body.companyId),
    'userId': mongoose.Types.ObjectId(req.body.userId),
    'subscriberId': req.body.subscriberId,
    'pageId': mongoose.Types.ObjectId(req.body.pageId)
  }
  logger.serverLog('', `payload ${JSON.stringify(payload)}`)
  PageAdminSubscriptionsDataLayer.create(payload)
    .then(updatedRecord => {
      utility.callApi(`pages/query`, 'post', { pageId: req.body.pageId, companyId: req.body.companyId }, 'accounts')
        .then(pages => {
          let page = pages[0]
          require('./../../../config/socketio').sendMessageToClient({
            room_id: updatedRecord.companyId,
            body: {
              action: 'admin_subscriber',
              payload: {
                subscribed_page: page
              }
            }
          })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error in Getting pages${JSON.stringify(err)}`
          })
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
