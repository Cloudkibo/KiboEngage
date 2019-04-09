const logger = require('../../../components/logger')
const TAG = 'api/wordpressEvents/wordpress.controller.js'
const AutoPosting = require('../autoposting/autoposting.datalayer')
const utility = require('../utility')
const AutoPostingMessage = require('../autopostingMessages/autopostingMessages.datalayer')
const URLObject = require('../URLForClickedCount/URL.datalayer')
const _ = require('lodash')
const config = require('../../../config/environment/index')
const broadcastApi = require('../../global/broadcastApi')

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
        utility.callApi('pages/query', 'post', pagesFindCriteria, req.headers.authorization)
          .then(pages => {
            pages.forEach(page => {
              let subscribersData = [
                {$match: {pageId: page._id, companyId: page.companyId}},
                {$group: {_id: null, count: {$sum: 1}}}
              ]
              utility.callApi('subscribers/query', 'post', subscribersData, req.headers.authorization)
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
                        let messageData = {}
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
                            messageData = JSON.stringify({
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
                            })
                            sendAutopostingMessage(messageData, postingItem, subscribersCount, page)
                          })
                          .catch(err => {
                            logger.serverLog(`Failed to create url object ${JSON.stringify(err)}`)
                          })
                      })
                      .catch(err => {
                        logger.serverLog(`Failed to create autoposting message ${JSON.stringify(err)}`)
                      })
                  }
                })
                .catch(err => {
                  logger.serverLog(`Failed to fetch subscriber count ${JSON.stringify(err)}`)
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

function sendAutopostingMessage (messageData, postingItem, subscribersCount, page) {
  broadcastApi.callMessageCreativesEndpoint({
    'messages': messageData
  }, page.accessToken)
    .then(messageCreative => {
      if (messageCreative.status === 'sucess') {
        const messageCreativeId = messageCreative.message_creative_id
        utility.callApi('tags/query', 'post', {purpose: 'findAll', match: {companyId: page.companyId, pageId: page._id}}, '', 'kiboengage')
          .then(pageTags => {
            const limit = Math.ceil(subscribersCount[0].count / 10000)
            for (let i = 0; i < limit; i++) {
              let labels = []
              labels.push(pageTags.filter((pt) => pt.tag === `_${page.pageId}_${i + 1}`)[0].labelFbId)
              if (postingItem.segmentationGender.length > 0) {
                let temp = pageTags.filter((pt) => postingItem.segmentationGender.includes(pt.tag)).map((pt) => pt.labelFbId)
                labels = labels.concat(temp)
              }
              if (postingItem.segmentationLocale.length > 0) {
                let temp = pageTags.filter((pt) => postingItem.segmentationLocale.includes(pt.tag)).map((pt) => pt.labelFbId)
                labels = labels.concat(temp)
              }
              if (postingItem.segmentationTags.length > 0) {
                let temp = pageTags.filter((pt) => postingItem.segmentationTags.includes(pt._id)).map((pt) => pt.labelFbId)
                labels = labels.concat(temp)
              }
              broadcastApi.callBroadcastMessagesEndpoint(messageCreativeId, labels, page.pageAccessToken)
                .then(response => {
                  if (i === limit - 1) {
                    if (response.status === 'success') {
                      utility.callApi('autoposting_messages', 'put', {purpose: 'updateOne', match: {_id: postingItem._id}, updated: {messageCreativeId, broadcastFbId: response.broadcast_id, APIName: 'broadcast_api'}}, '', 'kiboengage')
                        .then(updated => {
                          logger.serverLog(TAG, `Twitter autoposting sent successfully!`)
                        })
                        .catch(err => {
                          logger.serverLog(`Failed to send broadcast ${JSON.stringify(err)}`)
                        })
                    } else {
                      logger.serverLog(`Failed to send broadcast ${JSON.stringify(response.description)}`)
                    }
                  }
                })
                .catch(err => {
                  logger.serverLog(`Failed to send broadcast ${JSON.stringify(err)}`)
                })
            }
          })
          .catch(err => {
            logger.serverLog(`Failed to find tags ${JSON.stringify(err)}`)
          })
      } else {
        logger.serverLog(`Failed to send broadcast ${JSON.stringify(messageCreative.description)}`)
      }
    })
    .catch(err => {
      logger.serverLog(`Failed to send broadcast ${JSON.stringify(err)}`)
    })
}
