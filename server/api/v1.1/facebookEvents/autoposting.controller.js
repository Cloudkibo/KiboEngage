const logger = require('../../../components/logger')
const AutoPostingDataLayer = require('../autoposting/autoposting.datalayer')
const AutopostingMessagesDataLayer = require('../autopostingMessages/autopostingMessages.datalayer')
const autopostingLogicLayer = require('./autoposting.logiclayer')
const TAG = 'api/v1/facebookEvents/autoposting.controller.js'
const utility = require('../utility')
const {sentUsinInterval} = require('./utility')

exports.autoposting = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  AutoPostingDataLayer.findAllAutopostingObjectsUsingQuery({ accountUniqueName: req.body.entry[0].changes[0].value.sender_id, isActive: true })
    .then(autopostings => {
      autopostings.forEach(postingItem => {
        let pagesFindCriteria = autopostingLogicLayer.pagesFindCriteria(postingItem)
        utility.callApi(`pages/query`, 'post', pagesFindCriteria, req.headers.authorization)
          .then(pages => {
            pages.forEach(page => {
              let subscribersData = [
                {$match: {pageId: page._id, companyId: page.companyId}},
                {$group: {_id: null, count: {$sum: 1}}}
              ]
              utility.callApi('subscribers/aggregate', 'post', subscribersData, req.headers.authorization)
                .then(subscribersCount => {
                  if (subscribersCount.length > 0) {
                    AutopostingMessagesDataLayer.createAutopostingMessage({
                      pageId: page._id,
                      companyId: postingItem.companyId,
                      autoposting_type: 'facebook',
                      autopostingId: postingItem._id,
                      sent: subscribersCount[0].count,
                      message_id: req.body.entry[0].changes[0].value.post_id,
                      seen: 0,
                      clicked: 0
                    })
                      .then(savedMsg => {
                        autopostingLogicLayer.handleFacebookPayload(req.body.entry[0].changes[0].value, savedMsg, page)
                          .then(messageData => {
                            console.log('final payload length', messageData.length)
                            sentUsinInterval(messageData, page, postingItem, subscribersCount, req, 3000)
                          })
                          .catch(err => {
                            logger.serverLog(`Failed to prepare data`, err)
                          })
                      })
                      .catch(err => {
                        logger.serverLog(TAG, `Failed to create autoposting message ${err}`, 'error')
                      })
                  }
                })
                .catch(err => {
                  logger.serverLog(TAG, `Failed to fetch subscriber count ${JSON.stringify(err)}`, 'error')
                })
            })
          })
          .catch(err => {
            logger.serverLog(TAG, `Failed to fetch pages ${JSON.stringify(err)}`, 'error')
          })
      })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch autopostings ${JSON.stringify(err)}`, 'error')
    })
}
