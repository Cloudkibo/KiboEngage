const logger = require('../../../components/logger')
const TAG = 'api/twitterEvents/twitter.controller.js'
const AutoPosting = require('../autoposting/autoposting.datalayer')
const AutoPostingMessage = require('../autopostingMessages/autopostingMessages.datalayer')
const utility = require('../utility')
const _ = require('lodash')
const logicLayer = require('./logiclayer')
const {sentUsinInterval} = require('../facebookEvents/utility')

exports.findAutoposting = function (req, res) {
  logger.serverLog(TAG, `in findAutoposting ${JSON.stringify(req.body)}`)
  AutoPosting.findAllAutopostingObjectsUsingQuery({subscriptionType: 'twitter', isActive: true})
    .then(autoposting => {
      return res.status(200).json({
        status: 'success',
        payload: autoposting
      })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal server error while fetching autopots ${err}`
      })
    })
}

exports.twitterwebhook = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  AutoPosting.findAllAutopostingObjectsUsingQuery({accountUniqueName: req.body.user.screen_name, isActive: true})
    .then(autopostings => {
      logger.serverLog(TAG, `autoposting found ${JSON.stringify(autopostings)}`, 'debug')
      autopostings.forEach(postingItem => {
        let pagesFindCriteria = {
          companyId: postingItem.companyId,
          connected: true
        }
        if (postingItem.isSegmented) {
          if (postingItem.segmentationPageIds && postingItem.segmentationPageIds.length > 0) {
            pagesFindCriteria = _.merge(pagesFindCriteria, {
              pageId: {
                $in: postingItem.segmentationPageIds
              }
            })
          }
        }
        utility.callApi('pages/query', 'post', pagesFindCriteria, req.headers.authorization)
          .then(pages => {
            pages.forEach(page => {
              let subscribersData = [
                {$match: {pageId: page._id, companyId: page.companyId, isSubscribed: true}},
                {$group: {_id: null, count: {$sum: 1}}}
              ]
              utility.callApi('subscribers/aggregate', 'post', subscribersData, req.headers.authorization)
                .then(subscribersCount => {
                  if (subscribersCount.length > 0) {
                    let newMsg = {
                      pageId: page._id,
                      companyId: postingItem.companyId,
                      autoposting_type: 'twitter',
                      autopostingId: postingItem._id,
                      sent: subscribersCount[0].count,
                      message_id: req.body.id.toString(),
                      seen: 0,
                      clicked: 0
                    }
                    AutoPostingMessage.createAutopostingMessage(newMsg)
                      .then(savedMsg => {
                        logicLayer.handleTwitterPayload(req, savedMsg, page)
                          .then(messageData => {
                            console.log('final payload length', messageData.length)
                            sentUsinInterval(messageData, page, postingItem, subscribersCount, req, 3000)
                          })
                          .catch(err => {
                            logger.serverLog(`Failed to prepare data`, err)
                          })
                      })
                      .catch(err => {
                        logger.serverLog(`Failed to create autoposting message ${JSON.stringify(err)}`, 'error')
                      })
                  }
                })
                .catch(err => {
                  logger.serverLog(`Failed to fetch subscriber count ${JSON.stringify(err)}`, 'error')
                })
            })
          })
          .catch(err => {
            if (err) logger.serverLog(TAG, `Internal server error while fetching pages ${err}`, 'error')
          })
      })
    })
    .catch(err => {
      logger.serverLog(TAG, `Internal server error while fetching autoposts ${err}`, 'error')
    })
}
