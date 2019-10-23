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
  logger.serverLog(TAG, `Wordpress post received : ${JSON.stringify(req.body)}`)
  let wpUrl = req.body.guid
  let wordpressUniqueId = wpUrl.split('/')[0] + wpUrl.split('/')[1] + '//' + wpUrl.split('/')[2]
  logger.serverLog(TAG, `Wordpress unique id:  ${JSON.stringify(wordpressUniqueId)}`)
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
                {$match: {pageId: page._id, companyId: page.companyId}},
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
                            let subsFindCriteria = prepareSubscribersCriteria(req.body, page)
                            if (postingItem.isSegmented && postingItem.segmentationTags.length > 0) {
                              utility.callApi(`tags/query`, 'post', { companyId: page.companyId, tag: { $in: postingItem.segmentationTags } })
                                .then(tags => {
                                  let tagIds = tags.map((t) => t._id)
                                  utility.callApi(`tags_subscriber/query`, 'post', { tagId: { $in: tagIds } })
                                    .then(tagSubscribers => {
                                      if (tagSubscribers.length > 0) {
                                        let subscriberIds = tagSubscribers.map((ts) => ts.subscriberId._id)
                                        subsFindCriteria['_id'] = {$in: subscriberIds}
                                        sendUsingBatchAPI('autoposting', messageData, subsFindCriteria, page, '', reportObj)
                                        logger.serverLog(TAG, 'Conversation sent successfully!')
                                      } else {
                                        logger.serverLog(TAG, 'No subscribers match the given criteria', 'error')
                                      }
                                    })
                                    .catch(err => {
                                      logger.serverLog(TAG, err)
                                    })
                                })
                                .catch(err => {
                                  logger.serverLog(TAG, err)
                                })
                            } else {
                              sendUsingBatchAPI('autoposting', messageData, subsFindCriteria, page, '', reportObj)
                              logger.serverLog(TAG, 'Conversation sent successfully!')
                            }
                          })
                          .catch(err => {
                            logger.serverLog(`Failed to create url object ${JSON.stringify(err)}`, 'error')
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
