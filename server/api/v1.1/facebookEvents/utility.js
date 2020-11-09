const logger = require('../../../components/logger')
const TAG = 'api/twitterEvents/twitter.controller.js'
const utility = require('../utility')
const broadcastApi = require('../../global/broadcastApi')
const path = require('path')
const fs = require('fs')

exports.sentUsinInterval = function (messageData, page, postingItem, subscribersCount, req, delay) {
  let current = 0
  let send = true
  let interval = setInterval(() => {
    if (current === messageData.length) {
      clearInterval(interval)
    } else {
      if (send) {
        send = false
        broadcastApi.callMessageCreativesEndpoint(messageData[current], page.accessToken, page, 'facebookEvents/utility.js', 'autoposting')
          .then(messageCreative => {
            if (messageCreative.status === 'success') {
              const messageCreativeId = messageCreative.message_creative_id
              utility.callApi('tags/query', 'post', {companyId: page.companyId, pageId: page._id})
                .then(pageTags => {
                  console.log('pageTags', pageTags)
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
                    console.log('labels', labels)
                    broadcastApi.callBroadcastMessagesEndpoint(messageCreativeId, labels, notlabels, page.accessToken, page, 'FacebookEvents/utility.js')
                      .then(response => {
                        console.log('response from callBroadcastMessagesEndpoint', response)
                        if (messageData[current].attachment && messageData[current].attachment.type === 'video' &&
                        messageData[current].attachment.payload.url.includes('kiboengage.cloudkibo.com')) {
                          let url = messageData[current].attachment.payload.url
                          let filename = url.split('/')[url.split('/').length - 1]
                          let dir = path.resolve(__dirname, '../../../../broadcastFiles/userfiles')
                          fs.unlink(dir + '/' + filename, function (err) {
                            if (err) {
                              const message = err || 'Internal Server Error'
                              logger.serverLog(message, `${TAG}: exports.sentUsinInterval`, {messageData, user: req.user}, {}, 'error')
                            } else {
                              console.log('unlinked')
                            }
                          })
                        }
                        if (i === limit - 1) {
                          if (response.status === 'success') {
                            utility.callApi('autoposting_messages', 'put', {purpose: 'updateOne', match: {_id: postingItem._id}, updated: {messageCreativeId, broadcastFbId: response.broadcast_id, APIName: 'broadcast_api'}}, 'kiboengage')
                              .then(updated => {
                                require('../../global/messageStatistics').record('autoposting')
                                let autopostingType = postingItem.subscriptionType
                                require('../../global/messageStatistics').record(`autoposting${autopostingType}`)
                                current++
                                send = true
                              })
                              .catch(err => {
                                const message = err || 'Failed to send broadcast'
                                logger.serverLog(message, `${TAG}: exports.sentUsinInterval`, {user: req.user, messageData}, {}, 'error')
                                current++
                                send = true
                              })
                          } else {
                            current++
                            send = true
                          }
                        }
                      })
                      .catch(err => {
                        const message = err || 'Failed to send broadcast'
                        logger.serverLog(message, `${TAG}: exports.sentUsinInterval`, {user: req.user, messageData}, {}, 'error')
                        current++
                        send = true
                      })
                  }
                })
                .catch(err => {
                  const message = err || 'Failed to find tags'
                  logger.serverLog(message, `${TAG}: exports.sentUsinInterval`, {user: req.user, messageData}, {}, 'error')
                  current++
                  send = true
                })
            } else {
              current++
              send = true
            }
          })
          .catch(err => {
            const message = err || 'Failed to send broadcast'
            logger.serverLog(message, `${TAG}: exports.sentUsinInterval`, {user: req.user, messageData}, {}, 'error')
            current++
            send = true
          })
      }
    }
  }, delay)
}
