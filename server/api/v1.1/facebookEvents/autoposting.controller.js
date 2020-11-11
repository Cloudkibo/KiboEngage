const logger = require('../../../components/logger')
const AutoPostingDataLayer = require('../autoposting/autoposting.datalayer')
const AutopostingMessagesDataLayer = require('../autopostingMessages/autopostingMessages.datalayer')
const autopostingLogicLayer = require('./autoposting.logiclayer')
const TAG = 'api/v1/facebookEvents/autoposting.controller.js'
const utility = require('../utility')
const { prepareSubscribersCriteria } = require('../../global/utility')
const { sendUsingBatchAPI } = require('../../global/sendConversation')
const { isApprovedForSMP } = require('../../global/subscriptionMessaging')

exports.autoposting = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  AutoPostingDataLayer.findAllAutopostingObjectsUsingQuery({ accountUniqueName: req.body.entry[0].changes[0].value.from.id, isActive: true })
    .then(autopostings => {
      autopostings.forEach(postingItem => {
        let pagesFindCriteria = autopostingLogicLayer.pagesFindCriteria(postingItem)
        utility.callApi(`pages/query`, 'post', pagesFindCriteria)
          .then(pages => {
            pages.forEach(page => {
              let subscribersData = [
                {$match: {pageId: page._id, companyId: page.companyId, completeInfo: true}},
                {$group: {_id: null, count: {$sum: 1}}}
              ]
              utility.callApi('subscribers/aggregate', 'post', subscribersData)
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
                            let reportObj = {
                              successful: 0,
                              unsuccessful: 0,
                              errors: []
                            }
                            isApprovedForSMP({pageId: page.pageId, accessToken: page.accessToken})
                              .then(smpStatus => {
                                let smp = false
                                if ((smpStatus === 'approved')) {
                                  smp = true
                                }
                                let subsFindCriteria = prepareSubscribersCriteria(req.body, page, undefined, messageData.length, smp)
                                if (postingItem.isSegmented && postingItem.segmentationTags.length > 0) {
                                  utility.callApi(`tags/query`, 'post', { companyId: page.companyId, tag: { $in: postingItem.segmentationTags } })
                                    .then(tags => {
                                      let tagIds = tags.map((t) => t._id)
                                      utility.callApi(`tags_subscriber/query`, 'post', { tagId: { $in: tagIds } })
                                        .then(tagSubscribers => {
                                          if (tagSubscribers.length > 0) {
                                            let subscriberIds = tagSubscribers.map((ts) => ts.subscriberId._id)
                                            subsFindCriteria['_id'] = {$in: subscriberIds}
                                            _countUpdate(subsFindCriteria, req.body.entry[0].changes[0].value.post_id)
                                            sendUsingBatchAPI('autoposting', messageData, {criteria: subsFindCriteria}, page, '', reportObj)
                                          }
                                        })
                                        .catch(err => {
                                          const message = err || 'Internal Server Error'
                                          logger.serverLog(message, `${TAG}: exports.autoposting`, req.body, {}, 'error')
                                        })
                                    })
                                    .catch(err => {
                                      const message = err || 'Internal Server Error'
                                      logger.serverLog(message, `${TAG}: exports.autoposting`, req.body, {}, 'error')
                                    })
                                } else {
                                  _countUpdate(subsFindCriteria, req.body.entry[0].changes[0].value.post_id)
                                  sendUsingBatchAPI('autoposting', messageData, {criteria: subsFindCriteria}, page, '', reportObj)
                                }
                              }).catch(err => {
                                const message = err || 'Internal Server Error'
                                logger.serverLog(message, `${TAG}: exports.autoposting`, req.body, {}, 'error')
                              })
                          })
                          .catch(err => {
                            const message = err || 'Failed to prepare data'
                            logger.serverLog(message, `${TAG}: exports.autoposting`, req.body, {}, 'error')
                          })
                      })
                      .catch(err => {
                        const message = err || 'Failed to create autoposting message'
                        logger.serverLog(message, `${TAG}: exports.autoposting`, req.body, {}, 'error')
                      })
                  }
                })
                .catch(err => {
                  const message = err || 'Failed to fetch subscriber count'
                  logger.serverLog(message, `${TAG}: exports.autoposting`, req.body, {}, 'error')
                })
            })
          })
          .catch(err => {
            const message = err || 'Failed to fetch pages'
            logger.serverLog(message, `${TAG}: exports.autoposting`, req.body, {}, 'error')
          })
      })
    })
    .catch(err => {
      const message = err || 'Failed to fetch autopostings'
      logger.serverLog(message, `${TAG}: exports.autoposting`, req.body, {}, 'error')
    })
}

const _countUpdate = (subsFindCriteria, messageId) => {
  let subscriberCountCriteria = [...subsFindCriteria]
  delete subscriberCountCriteria[0].$limit
  subscriberCountCriteria.push({$group: {_id: null, count: {$sum: 1}}})
  utility.callApi(`subscribers/aggregate`, 'post', subscriberCountCriteria)
    .then(response => {
      if (response.length > 0) {
        AutopostingMessagesDataLayer.findOneAutopostingMessageAndUpdate({message_id: messageId}, {sent: response[0].count}, {})
          .then(Autopostingresponse => {
          }).catch(err => {
            const message = err || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: _countUpdate`, {subsFindCriteria, messageId}, {}, 'error')
          })
      }
    }).catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _countUpdate`, {subsFindCriteria, messageId}, {}, 'error')
    })
}
