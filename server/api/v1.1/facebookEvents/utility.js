const logger = require('../../../components/logger')
const TAG = 'api/twitterEvents/twitter.controller.js'
const utility = require('../utility')
const broadcastApi = require('../../global/broadcastApi')

exports.sentUsinInterval = function (messageData, page, postingItem, subscribersCount, req, delay) {
  let current = 0
  let send = true
  let interval = setInterval(() => {
    if (current === messageData.length) {
      clearInterval(interval)
      logger.serverLog(TAG, `Twitter autoposting sent successfully!`)
    } else {
      if (send) {
        send = false
        broadcastApi.callMessageCreativesEndpoint(messageData[current], page.accessToken, 'autoposting')
          .then(messageCreative => {
            if (messageCreative.status === 'success') {
              const messageCreativeId = messageCreative.message_creative_id
              utility.callApi('tags/query', 'post', {companyId: page.companyId, pageId: page._id}, req.headers.authorization)
                .then(pageTags => {
                  const limit = Math.ceil(subscribersCount[0].count / 10000)
                  for (let i = 0; i < limit; i++) {
                    let labels = []
                    let unsubscribeTag = pageTags.filter((pt) => pt.tag === `_${page.pageId}_unsubscribe`)
                    let pageIdTag = pageTags.filter((pt) => pt.tag === `_${page.pageId}_${i + 1}`)
                    let notlabels = unsubscribeTag.length > 0 && [unsubscribeTag[0].labelFbId]
                    pageIdTag.length > 0 && labels.push(pageIdTag[0].labelFbId)
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
                    broadcastApi.callBroadcastMessagesEndpoint(messageCreativeId, labels, notlabels, page.accessToken)
                      .then(response => {
                        console.log('response from callBroadcastMessagesEndpoint', response)
                        if (i === limit - 1) {
                          if (response.status === 'success') {
                            utility.callApi('autoposting_messages', 'put', {purpose: 'updateOne', match: {_id: postingItem._id}, updated: {messageCreativeId, broadcastFbId: response.broadcast_id, APIName: 'broadcast_api'}}, '', 'kiboengage')
                              .then(updated => {
                                current++
                                send = true
                              })
                              .catch(err => {
                                logger.serverLog(`Failed to send broadcast ${JSON.stringify(err)}`)
                                current++
                                send = true
                              })
                          } else {
                            logger.serverLog(`Failed to send broadcast ${JSON.stringify(response.description)}`, 'error')
                            current++
                            send = true
                          }
                        }
                      })
                      .catch(err => {
                        logger.serverLog(`Failed to send broadcast ${JSON.stringify(err)}`, 'error')
                        current++
                        send = true
                      })
                  }
                })
                .catch(err => {
                  logger.serverLog(`Failed to find tags ${JSON.stringify(err)}`, 'error')
                  current++
                  send = true
                })
            } else {
              logger.serverLog(`Failed to send broadcast ${JSON.stringify(messageCreative.description)}`, 'error')
              current++
              send = true
            }
          })
          .catch(err => {
            logger.serverLog(`Failed to send broadcast ${JSON.stringify(err)}`, 'error')
            current++
            send = true
          })
      }
    }
  }, delay)
}
