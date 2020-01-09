'use strict'
const compose = require('composable-middleware')
const utility = require('../v1.1/utility')
const { isApprovedForSMP } = require('../global/subscriptionMessaging')

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
              req.SMPStatus = statusArray
              next()
            })
        }
      })
      .catch(err => {
        return res.status(500)
          .json({ status: 'failed', description: `Internal Server Error: ${err}` })
      })
  })
}

function checkStatusForEachPage (connectedPages) {
  return new Promise((resolve, reject) => {
    let statusArray = []
    for (let i = 0; i < connectedPages.length; i++) {
      isApprovedForSMP(connectedPages[i])
        .then(smpStatus => {
          statusArray.push({ pageId: connectedPages[i]._id, smpStatus: smpStatus })
          if (i === connectedPages.length - 1) {
            resolve(statusArray)
          }
        })
        .catch(err => {
          reject(err)
        })
    }
  })
}
