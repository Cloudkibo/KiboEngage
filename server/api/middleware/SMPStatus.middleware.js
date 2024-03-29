'use strict'
const compose = require('composable-middleware')
const utility = require('../v1.1/utility')
const { isApprovedForSMP } = require('../global/subscriptionMessaging')
const async = require('async')
const TAG = 'api/middleware'
const logger = require('../../components/logger')

exports.checkSMP = () => {
  return compose().use((req, res, next) => {
    utility.callApi(`pages/query`, 'post', { companyId: req.user.companyId, connected: true })
      .then(connectedPages => {
        if (!connectedPages) {
          return res.status(500)
            .json({
              status: 'failed',
              description: 'Fatal Error. There is no connected page with your app.'
            })
        }
        if (connectedPages.length > 0) {
          checkStatusForEachPage(connectedPages)
            .then(statusArray => {
              req.user.SMPStatus = statusArray
              next()
            })
        }
      })
      .catch(err => {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: exports.checkSMP`, req.body, {user: req.user}, 'error')
        return res.status(500)
          .json({ status: 'failed', description: `Internal Server Error: ${err}` })
      })
  })
}

function checkStatusForEachPage (connectedPages) {
  return new Promise((resolve, reject) => {
    let statusArray = []
    async.each(connectedPages, function (connectedPage, next) {
      isApprovedForSMP(connectedPage)
        .then(smpStatus => {
          statusArray.push({ pageId: connectedPage._id, smpStatus: smpStatus })
          next()
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: checkStatusForEachPage`, {connectedPages}, {}, 'error')
          reject(err)
        })
    }, function (err) {
      if (err) {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: checkStatusForEachPage`, {connectedPages}, {}, 'error')
        reject(err)
      } else {
        resolve(statusArray)
      }
    })
  })
}
