const logger = require('../../../components/logger')
const TAG = 'api/wordpressEvents/wordpress.controller.js'
const AutoPosting = require('../autoposting/autoposting.datalayer')
const utility = require('../utility')
const AutoPostingMessage = require('../autopostingMessages/autopostingMessages.datalayer')
const URLObject = require('../URLForClickedCount/URL.datalayer')
const _ = require('lodash')
const config = require('../../../config/environment/index')
const { prepareSubscribersCriteria } = require('../../global/utility')
const { sendUsingBatchAPI } = require('../../global/sendConversation')

exports.postPublish = function (req, res) {
  let wpUrl = req.body.guid
  let wordpressUniqueId = wpUrl.split('/')[0] + wpUrl.split('/')[1] + '//' + wpUrl.split('/')[2]
  AutoPosting.findAllAutopostingObjectsUsingQuery({ accountUniqueName: wordpressUniqueId, isActive: true })
    .then(autopostings => {
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
        utility.callApi('pages/query', 'post', pagesFindCriteria)
          .then(pages => {
            pages.forEach(page => {
              let subscribersData = [
                {$match: {pageId: page._id, companyId: page.companyId, completeInfo: true}},
                {$group: {_id: null, count: {$sum: 1}}}
              ]
              utility.callApi('subscribers/query', 'post', subscribersData)
                .then(subscribersCount => {
                  if (subscribersCount.length > 0) {
                    let newMsg = {
                      pageId: page._id,
                      companyId: postingItem.companyId,
                      autoposting_type: 'wordpress',
                      autopostingId: postingItem._id,
                      sent: subscribersCount[0].count,
                      message_id: req.body.guid,
                      seen: 0,
                      clicked: 0
                    }
                    AutoPostingMessage.createAutopostingMessage(newMsg)
                      .then(savedMsg => {
                        let urlObject = {
                          originalURL: req.body.guid,
                          module: {
                            id: savedMsg._id,
                            type: 'autoposting'
                          }
                        }
                        URLObject.createURLObject(urlObject)
                          .then(savedurl => {
                            let newURL = config.domain + '/api/URL/' + savedurl._id
                            let messageData = {
                              'attachment': {
                                'type': 'template',
                                'payload': {
                                  'template_type': 'generic',
                                  'elements': [
                                    {
                                      'title': req.body.post_title,
                                      'image_url': 'https://cdn.cloudkibo.com/public/img/wordpress.png',
                                      'subtitle': 'sent using kibopush.com',
                                      'buttons': [
                                        {
                                          'type': 'web_url',
                                          'url': newURL,
                                          'title': 'View Wordpress Blog Post'
                                        }
                                      ]
                                    }
                                  ]
                                }
                              }
                            }
                            let reportObj = {
                              successful: 0,
                              unsuccessful: 0,
                              errors: []
                            }
                            let subsFindCriteria = prepareSubscribersCriteria(req.body, page, undefined, messageData.length)
                            if (postingItem.isSegmented && postingItem.segmentationTags.length > 0) {
                              utility.callApi(`tags/query`, 'post', { companyId: page.companyId, tag: { $in: postingItem.segmentationTags } })
                                .then(tags => {
                                  let tagIds = tags.map((t) => t._id)
                                  utility.callApi(`tags_subscriber/query`, 'post', { tagId: { $in: tagIds } })
                                    .then(tagSubscribers => {
                                      if (tagSubscribers.length > 0) {
                                        let subscriberIds = tagSubscribers.map((ts) => ts.subscriberId._id)
                                        subsFindCriteria['_id'] = {$in: subscriberIds}
                                        sendUsingBatchAPI('autoposting', messageData, {criteria: subsFindCriteria}, page, '', reportObj)
                                      }
                                    })
                                    .catch(err => {
                                      const message = err || 'Internal server error'
                                      logger.serverLog(message, `${TAG}: exports.postPublish`, req.body, {}, 'error')
                                    })
                                })
                                .catch(err => {
                                  const message = err || 'Internal server error'
                                  logger.serverLog(message, `${TAG}: exports.postPublish`, req.body, {}, 'error')
                                })
                            } else {
                              sendUsingBatchAPI('autoposting', messageData, {criteria: subsFindCriteria}, page, '', reportObj)
                            }
                          })
                          .catch(err => {
                            const message = err || 'Failed to create url object'
                            logger.serverLog(message, `${TAG}: exports.postPublish`, req.body, {}, 'error')
                          })
                      })
                      .catch(err => {
                        const message = err || 'Failed to create autoposting message'
                        logger.serverLog(message, `${TAG}: exports.postPublish`, req.body, {}, 'error')
                      })
                  }
                })
                .catch(err => {
                  const message = err || 'Failed to fetch subscriber count'
                  logger.serverLog(message, `${TAG}: exports.postPublish`, req.body, {}, 'error')
                })
            })
          })
          .catch(err => {
            return res.status(500).json({
              status: 'failed',
              description: `Internal server error while fetching pages ${err}`
            })
          })
      })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal server error while fetching autoposts ${err}`
      })
    })
}
