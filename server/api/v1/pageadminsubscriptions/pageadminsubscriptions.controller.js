'use strict'

var PageAdminSubscriptionsDataLayer = require('./pageadminsubscriptions.datalayer')

// Get list of companyprofiles
exports.index = function (req, res) {
  PageAdminSubscriptionsDataLayer.genericFind({userId: req.user._id})
    .then(subscriptionInfo => {
      return res.status(200)
        .json({status: 'success', payload: subscriptionInfo})
    })
    .catch(err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
    })
}
