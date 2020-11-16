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
  utility.callApi(`pages/update`, 'put', {query: { pageId: pageId }, newPayload: { $set: { pageName: newPageName } }, options: { multi: true }})
    .then(page => {
    })
    .catch(err => {
      const message = err || 'Failed to update page name'
      logger.serverLog(message, `${TAG}: _countUpdate`, req.body, {user: req.user}, 'error')
    })
}
