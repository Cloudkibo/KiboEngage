const logger = require('../../../components/logger')
const AutoPostingDataLayer = require('../autoposting/autoposting.datalayer')
const URLDataLayer = require('../URLForClickedCount/URL.datalayer')
const AutopostingMessagesDataLayer = require('../autopostingMessages/autopostingMessages.datalayer')
const autopostingLogicLayer = require('./autoposting.logiclayer')
const og = require('open-graph')
const TAG = 'api/v1/facebookEvents/autoposting.controller.js'
let config = require('./../../../config/environment')
const utility = require('../utility')
const broadcastApi = require('../../global/broadcastApi')

exports.autoposting = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })

  logger.serverLog(TAG, `in autoposting ${JSON.stringify(req.body)}`)
  for (let i = 0; i < req.body.entry[0].changes.length; i++) {
    const event = req.body.entry[0].changes[i]
    if (event.value.verb === 'add' &&
      (['status', 'photo', 'video', 'share'].indexOf(event.value.item) >
        -1)) {
      if (event.value.item === 'share' && event.value.link) {
        og(event.value.link, (err, meta) => {
          if (err) {
            logger.serverLog(TAG, `Error: ${err}`)
          }
          logger.serverLog(TAG, `Url Meta: ${JSON.stringify(meta)}`)
          if (meta && meta.image && meta.image.url) {
            event.value.image = meta.image.url
          }
          handleThePagePostsForAutoPosting(req, event)
        })
      } else if (event.value.item === 'video' && event.value.message) {
        // handleThePagePostsForAutoPosting(req, event, 'status')
        handleThePagePostsForAutoPosting(req, event)
      } else {
        handleThePagePostsForAutoPosting(req, event)
      }
    }
  }
}
function handleThePagePostsForAutoPosting (req, event, status) {
  AutoPostingDataLayer.findAllAutopostingObjectsUsingQuery({ accountUniqueName: event.value.sender_id, isActive: true })
    .then(autopostings => {
      console.log('autopostings found', autopostings)
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
                  console.log('subscribersCount', subscribersCount)
                  if (subscribersCount.length > 0) {
                    AutopostingMessagesDataLayer.createAutopostingMessage({
                      pageId: page._id,
                      companyId: postingItem.companyId,
                      autoposting_type: 'facebook',
                      autopostingId: postingItem._id,
                      sent: subscribersCount[0].count,
                      message_id: event.value.post_id,
                      seen: 0,
                      clicked: 0
                    })
                      .then(savedMsg => {
                        let messageData = {}
                        if (event.value.item === 'status' || status) {
                          messageData = autopostingLogicLayer.prepareMessageDataForStatus(event)
                          sendAutopostingMessage(messageData, postingItem, subscribersCount, page, req)
                        } else if (event.value.item === 'share') {
                          URLDataLayer.createURLObject({
                            originalURL: event.value.link,
                            module: {
                              id: savedMsg._id,
                              type: 'autoposting'
                            }
                          })
                            .then(savedurl => {
                              let newURL = config.domain + '/api/URL/' + savedurl._id
                              messageData = autopostingLogicLayer.prepareMessageDataForShare(event, newURL)
                              sendAutopostingMessage(messageData, postingItem, subscribersCount, page, req)
                            })
                            .catch(err => {
                              logger.serverLog(`Failed to create url object ${JSON.stringify(err)}`)
                            })
                        } else if (event.value.item === 'photo') {
                          URLDataLayer.createURLObject({
                            originalURL: 'https://www.facebook.com/' + event.value.sender_id,
                            module: {
                              id: savedMsg._id,
                              type: 'autoposting'
                            }
                          })
                            .then(savedurl => {
                              let newURL = config.domain + '/api/URL/' + savedurl._id
                              messageData = autopostingLogicLayer.prepareMessageDataForImage(event, newURL)
                              sendAutopostingMessage(messageData, postingItem, subscribersCount, page, req)
                            })
                            .catch(err => {
                              logger.serverLog(`Failed to create url object ${JSON.stringify(err)}`)
                            })
                        } else if (event.value.item === 'video') {
                          messageData = autopostingLogicLayer.prepareMessageDataForVideo(event)
                          sendAutopostingMessage(messageData, postingItem, subscribersCount, page, req)
                        }
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
            logger.serverLog(TAG, `Failed to fetch pages ${JSON.stringify(err)}`)
          })
      })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch autopostings ${JSON.stringify(err)}`)
    })
}
function sendAutopostingMessage (messageData, postingItem, subscribersCount, page, req) {
  broadcastApi.callMessageCreativesEndpoint(messageData, page.accessToken, 'autoposting')
    .then(messageCreative => {
      console.log('messageCreative', messageCreative)
      if (messageCreative.status === 'success') {
        const messageCreativeId = messageCreative.message_creative_id
        utility.callApi('tags/query', 'post', {companyId: page.companyId, pageId: page._id}, req.headers.authorization)
          .then(pageTags => {
            console.log('pageTags found', pageTags)
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
              console.log('labels', labels)
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
