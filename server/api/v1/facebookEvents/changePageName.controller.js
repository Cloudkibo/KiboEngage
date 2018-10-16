const logger = require('../../../components/logger')
const TAG = 'api/facebookEvents/changePageName.controller.js'
const utility = require('../utility')

exports.changePageName = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let pageId = req.body.entry[0].id
  let newPageName = req.body.entry[0].changes[0].value
  logger.serverLog(TAG, `Page name update request ${JSON.stringify(req.body)}`)
  utility.callApi(`pages/update`, 'put', {query: { pageId: pageId }, newPayload: { $set: { pageName: newPageName } }, options: { multi: true }})
    .then(page => {
      logger.serverLog(TAG, `Page name updated: ${JSON.stringify(page)}`)
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to update page name ${JSON.stringify(err)}`)
    })
}
