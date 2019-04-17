const logger = require('../../../components/logger')
const TAG = 'api/twitterEvents/twitter.controller.js'
const AutoPosting = require('../autoposting/autoposting.datalayer')
const AutoPostingMessage = require('../autopostingMessages/autopostingMessages.datalayer')
const utility = require('../utility')
const _ = require('lodash')
const logicLayer = require('./logiclayer')
const broadcastApi = require('../../global/broadcastApi')

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
  logger.serverLog(TAG, `in twitterwebhook ${JSON.stringify(req.body)}`)
  console.log('in twitterwebhook', JSON.stringify(req.body))
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  AutoPosting.findAllAutopostingObjectsUsingQuery({accountUniqueName: req.body.user.screen_name, isActive: true})
    .then(autopostings => {
      console.log('autopostings found', autopostings)
      logger.serverLog(TAG, `autoposting found ${JSON.stringify(autopostings)}`)
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
            console.log('pages found', pages)
            logger.serverLog(TAG, `pages found ${JSON.stringify(pages)}`)
            pages.forEach(page => {
              let subscribersData = [
                {$match: {pageId: page._id, companyId: page.companyId}},
                {$group: {_id: null, count: {$sum: 1}}}
              ]
              utility.callApi('subscribers/aggregate', 'post', subscribersData, req.headers.authorization)
                .then(subscribersCount => {
                  console.log('subscribers found', subscribersCount)
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
                        console.log('savedMsg', savedMsg)
                        logicLayer.checkType(req.body, savedMsg)
                          .then(messageData => {
                            console.log('messageData', messageData)
                            broadcastApi.callMessageCreativesEndpoint(messageData, page.accessToken, 'autoposting')
                              .then(messageCreative => {
                                console.log('messageCreative', messageCreative)
                                if (messageCreative.status === 'success') {
                                  const messageCreativeId = messageCreative.message_creative_id
                                  utility.callApi('tags/query', 'post', {companyId: page.companyId, pageId: page._id}, req.headers.authorization)
                                    .then(pageTags => {
                                      console.log('pageTags', pageTags)
                                      const limit = Math.ceil(subscribersCount[0].count / 10000)
                                      console.log('limit', limit)
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
                                        broadcastApi.callBroadcastMessagesEndpoint(messageCreativeId, labels, page.accessToken)
                                          .then(response => {
                                            console.log('response from callBroadcastMessagesEndpoint', response)
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
                                      console.log('error in fetching tags', JSON.stringify(err))
                                      logger.serverLog(`Failed to find tags ${JSON.stringify(err)}`)
                                    })
                                } else {
                                  logger.serverLog(`Failed to send broadcast ${JSON.stringify(messageCreative.description)}`)
                                }
                              })
                              .catch(err => {
                                console.log('error in messageCreative', err)
                                logger.serverLog(`Failed to send broadcast ${JSON.stringify(err)}`)
                              })
                          })
                          .catch(err => {
                            logger.serverLog(`Failed to prepare data ${JSON.stringify(err)}`)
                          })
                      })
                      .catch(err => {
                        logger.serverLog(`Failed to create autoposting message ${JSON.stringify(err)}`)
                      })
                  }
                })
                .catch(err => {
                  console.log('Failed to fetch subscriber count', err)
                  logger.serverLog(`Failed to fetch subscriber count ${JSON.stringify(err)}`)
                })
            })
          })
          .catch(err => {
            if (err) logger.serverLog(TAG, `Internal server error while fetching pages ${err}`)
          })
      })
    })
    .catch(err => {
      if (err) logger.serverLog(TAG, `Internal server error while fetching autoposts ${err}`)
    })
}
