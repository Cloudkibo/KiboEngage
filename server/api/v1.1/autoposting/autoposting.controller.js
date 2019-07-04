const AutopostingDataLayer = require('./autoposting.datalayer')
const AutoPostingLogicLayer = require('./autoposting.logiclayer')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/autoposting/autoposting.controller'
const { sendTweet } = require('../twitterEvents/twitter.controller')
const { facebookApiCaller } = require('../../global/facebookApiCaller')
const feedparser = require('feedparser-promised')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      AutopostingDataLayer.findAllAutopostingObjectsUsingQuery({companyId: companyUser.companyId}, req.headers.authorization)
        .then(autoposting => {
          return res.status(200).json({
            status: 'success',
            payload: autoposting
          })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error while fetching autoposting${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    })
}

exports.create = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email, populate: 'companyId' }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      // calling accounts feature usage for this
      utility.callApi(`featureUsage/planQuery`, 'post', {planId: companyUser.companyId.planId}, req.headers.authorization)
        .then(planUsage => {
          utility.callApi('featureUsage/companyQuery', 'post', {companyId: companyUser.companyId._id}, req.headers.authorization)
            .then(companyUsage => {
              AutopostingDataLayer.countAutopostingDocuments({companyId: companyUser.companyId._id, subscriptionType: req.body.subscriptionType})
                .then(gotCount => {
                  if (gotCount > 0 && !companyUser.enableMoreAutoPostingIntegration) {
                    return res.status(403).json({
                      status: 'Failed',
                      description: 'Cannot add more integrations. Please contact support or remove existing ones'
                    })
                  }
                  AutopostingDataLayer.findAllAutopostingObjectsUsingQuery({companyId: companyUser.companyId._id, subscriptionUrl: req.body.subscriptionUrl})
                    .then(data => {
                      if (data && data.length > 0) {
                        return res.status(403).json({
                          status: 'Failed',
                          description: 'Cannot add duplicate accounts.'
                        })
                      }
                      let autoPostingPayload = AutoPostingLogicLayer.prepareAutopostingPayload(req, companyUser)
                      // let hasLimit = AutoPostingLogicLayer.checkPlanLimit(req.body.subscriptionType, planUsage, companyUsage)
                      // add paid plan check later
                      // if (!hasLimit) {
                      //   return res.status(500).json({
                      //     status: 'failed',
                      //     description: `Your ${req.body.subscriptionType} autopostings limit has reached. Please upgrade your plan to premium in order to add more feeds`
                      //   })
                      // }
                      if (req.body.subscriptionType === 'twitter') {
                        let url = req.body.subscriptionUrl
                        let urlAfterDot = url.substring(url.indexOf('.') + 1)
                        let screenName = urlAfterDot.substring(urlAfterDot.indexOf('/') + 1)
                        if (screenName.indexOf('/') > -1) screenName = screenName.substring(0, screenName.length - 1)
                        AutoPostingLogicLayer.findUser(screenName, (err, data) => {
                          if (err) {
                            logger.serverLog(TAG, `Twitter URL parse Error ${err}`, 'error')
                          }
                          let payload
                          if (data && !data.errors) {
                            autoPostingPayload.accountUniqueName = data.screen_name
                            payload = {
                              id: data.id_str,
                              name: data.name,
                              screen_name: data.screen_name,
                              profile_image_url: data.profile_image_url_https
                            }
                            autoPostingPayload.payload = payload
                            AutopostingDataLayer.createAutopostingObject(autoPostingPayload)
                              .then(result => {
                                utility.callApi('featureUsage/updateCompany', 'put', {query: {companyId: companyUser.companyId._id}, newPayload: {$inc: { twitter_autoposting: 1 }}, options: {}}, req.headers.authorization)
                                  .then(result => {
                                    logger.serverLog(TAG, 'Company Usage updated', 'debug')
                                  })
                                  .catch(err => {
                                    logger.serverLog(TAG, err, 'error')
                                    return res.status(500).json({
                                      status: 'failed',
                                      description: `An unexpected error occured. Please try again later.`
                                    })
                                  })
                                utility.callApi('twitter/restart', 'get', {}, req.headers.authorization, 'webhook')
                                require('./../../../config/socketio').sendMessageToClient({
                                  room_id: companyUser.companyId._id,
                                  body: {
                                    action: 'autoposting_created',
                                    payload: {
                                      autoposting_id: result._id,
                                      user_id: req.user._id,
                                      user_name: req.user.name,
                                      payload: result
                                    }
                                  }
                                })
                                return res.status(201).json({status: 'success', payload: result})
                              })
                              .catch(err => {
                                logger.serverLog(TAG, err, 'error')
                                return res.status(500).json({
                                  status: 'failed',
                                  description: `An unexpected error occured. Please try again later.`
                                })
                              })
                          } else {
                            return res.status(404).json({
                              status: 'Failed',
                              description: 'Cannot add this account or account not found'
                            })
                          }
                        })
                      } else if (req.body.subscriptionType === 'facebook') {
                        let screenName = AutoPostingLogicLayer.getFacebookScreenName(req.body.subscriptionUrl)
                        if (screenName) {
                          utility.callApi(`pages/query`, 'post', { companyId: req.user.companyId, $or: [{ pageId: screenName }, { pageUserName: screenName }] }, req.headers.authorization)
                            .then(pagesInfo => {
                              let pageInfo = pagesInfo[0]
                              if (!pageInfo) {
                                return res.status(404).json({
                                  status: 'Failed',
                                  description: 'Cannot add this page or page not found'
                                })
                              }
                              autoPostingPayload.accountUniqueName = pageInfo.pageId
                              AutopostingDataLayer.createAutopostingObject(autoPostingPayload)
                                .then(result => {
                                  utility.callApi('featureUsage/updateCompany', 'put', { query: { companyId: companyUser.companyId._id }, newPayload: { $inc: { facebook_autoposting: 1 } }, options: {} }, req.headers.authorization)
                                    .then(result => {
                                      logger.serverLog(TAG, 'Company Usage Updated', 'debug')
                                    })
                                    .catch(err => {
                                      logger.serverLog(TAG, err, 'error')
                                      return res.status(500).json({
                                        status: 'failed',
                                        description: `An unexpected error occured. Please try again later.`
                                      })
                                    })
                                  require('./../../../config/socketio').sendMessageToClient({
                                    room_id: companyUser.companyId._id,
                                    body: {
                                      action: 'autoposting_created',
                                      payload: {
                                        autoposting_id: result._id,
                                        user_id: req.user._id,
                                        user_name: req.user.name,
                                        payload: result
                                      }
                                    }
                                  })
                                  return res.status(201)
                                    .json({ status: 'success', payload: result })
                                })
                                .catch(err => {
                                  logger.serverLog(TAG, err, 'error')
                                  return res.status(500).json({
                                    status: 'failed',
                                    description: `An unexpected error occured. Please try again later.`
                                  })
                                })
                            })
                            .catch(err => {
                              logger.serverLog(TAG, err, 'error')
                              return res.status(403).json({
                                status: 'Failed',
                                description: `An enexpected error occured. Please try again later.`
                              })
                            })
                        } else {
                          return res.status(403).json({
                            status: 'Failed',
                            description: 'Invalid url provided. Please provide correct url.'
                          })
                        }
                      } else if (req.body.subscriptionType === 'youtube') {
                        let channelName = AutoPostingLogicLayer.getChannelName(req.body.subscriptionUrl)
                        autoPostingPayload.accountUniqueName = channelName
                        AutopostingDataLayer.createAutopostingObject(autoPostingPayload)
                          .then(result => {
                            return res.status(200).json({
                              status: 'success',
                              description: result
                            })
                          })
                          .catch(err => {
                            logger.serverLog(TAG, err, 'error')
                            return res.status(500).json({
                              status: 'failed',
                              description: `An unexpected error occured. Please try again later.`
                            })
                          })
                      } else if (req.body.subscriptionType === 'rss') {
                        // rss work here
                        feedparser.parse(req.body.subscriptionUrl)
                          .then(feed => {
                            console.log('feed parse response', JSON.stringify(feed))
                            if (feed) {
                              AutopostingDataLayer.createAutopostingObject(autoPostingPayload)
                                .then(result => {
                                  return res.status(200).json({
                                    status: 'success',
                                    description: result
                                  })
                                })
                                .catch(err => {
                                  logger.serverLog(TAG, err, 'error')
                                  return res.status(500).json({
                                    status: 'failed',
                                    description: `An unexpected error occured. Please try again later.`
                                  })
                                })
                            } else {
                              return res.status(500).json({status: 'failed', description: 'Invalid feed url provided'})
                            }
                          })
                          .catch(err => {
                            logger.serverLog(TAG, `Problem occured while parsing the feed url ${err}`, 'error')
                            return res.status(500).json({status: 'failed', description: 'Problem occured while parsing the feed url'})
                          })
                      } else if (req.body.subscriptionType === 'wordpress') {
                        let url = req.body.subscriptionUrl
                        let wordpressUniqueId = url.split('/')[0] + url.split('/')[1] + '//' + url.split('/')[2]
                        autoPostingPayload.accountUniqueName = wordpressUniqueId
                        AutopostingDataLayer.createAutopostingObject(autoPostingPayload)
                          .then(result => {
                            utility.callApi('featureUsage/updateCompany', 'put', {query: {companyId: companyUser.companyId._id}, newPayload: {$inc: { wordpress_autoposting: 1 }}, options: {}}, req.headers.authorization)
                              .then(result => {
                                require('./../../../config/socketio').sendMessageToClient({
                                  room_id: companyUser.companyId._id,
                                  body: {
                                    action: 'autoposting_created',
                                    payload: {
                                      autoposting_id: result._id,
                                      user_id: req.user._id,
                                      user_name: req.user.name,
                                      payload: result
                                    }
                                  }
                                })
                                return res.status(201)
                                  .json({status: 'success', payload: result})
                              })
                              .catch(err => {
                                logger.serverLog(TAG, err, 'error')
                                return res.status(500).json({
                                  status: 'failed',
                                  description: `An unexpected error occured. Please try again later.`
                                })
                              })
                          })
                      }
                    })
                    .catch(err => {
                      logger.serverLog(TAG, err, 'error')
                      return res.status(500).json({
                        status: 'failed',
                        description: `An unexpected error occured. Please try again later.`
                      })
                    })
                })
                .catch(err => {
                  logger.serverLog(TAG, err, 'error')
                  return res.status(500).json({
                    status: 'failed',
                    description: `An unexpected error occured. Please try again later.`
                  })
                })
            })
            .catch(err => {
              logger.serverLog(TAG, err, 'error')
              return res.status(500).json({
                status: 'failed',
                description: `An unexpected error occured. Please try again later.`
              })
            })
        })
        .catch(err => {
          logger.serverLog(TAG, err, 'error')
          return res.status(500).json({
            status: 'failed',
            description: `An unexpected error occured. Please try again later.`
          })
        })
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
      return res.status(500).json({
        status: 'failed',
        description: `An unexpected error occured. Please try again later.`
      })
    })
}
exports.edit = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      var autoposting = AutoPostingLogicLayer.prepareEditPayload(req)
      AutopostingDataLayer.genericFindByIdAndUpdate({_id: req.body._id}, autoposting)
        .then(autopostingUpdated => {
          if (!autoposting) {
            return res.status(404)
              .json({status: 'failed', description: 'Record not found'})
          }
          require('./../../../config/socketio').sendMessageToClient({
            room_id: companyUser.companyId,
            body: {
              action: 'autoposting_updated',
              payload: {
                autoposting_id: autoposting._id,
                user_id: req.user._id,
                user_name: req.user.name,
                payload: autoposting
              }
            }
          })
          return res.status(200).json({
            status: 'success',
            payload: autopostingUpdated
          })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error while fetching autoposting${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    })
}

exports.destroy = function (req, res) {
  AutopostingDataLayer.findOneAutopostingObject(req.params.id, req.user.companyId)
    .then(autoposting => {
      if (!autoposting) {
        return res.status(404)
          .json({status: 'failed', description: 'Record not found'})
      }
      AutopostingDataLayer.deleteAutopostingObject(autoposting._id)
        .then(result => {
          utility.callApi('twitter/restart', 'get', {}, req.headers.authorization, 'webhook')
          require('./../../../config/socketio').sendMessageToClient({
            room_id: autoposting.companyId,
            body: {
              action: 'autoposting_removed',
              payload: {
                autoposting_id: autoposting._id,
                user_id: req.user._id,
                user_name: req.user.name
              }
            }
          })
          return res.status(200).json({
            status: 'success',
            okfdescription: 'AutoPosting Deleted'
          })
        })
        .catch(err => {
          return res.status(500)
            .json({status: 'failed', description: `AutoPosting update failed ${err}`})
        })
    })
    .catch(err => {
      return res.status(500)
        .json({status: 'failed', description: `Internal Server Error in fetching autoposting object  ${err}`})
    })
}

exports.handleTweetModeration = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: 'Received the event'
  })
  const payload = JSON.parse(req.body.entry[0].messaging[0].postback.payload)
  let query = {
    purpose: 'findOne',
    match: {
      autopostingId: payload.autopostingId,
      'tweet.id_str': payload.tweetId
    }
  }
  AutopostingDataLayer.findOneAutopostingObjectUsingQuery({_id: payload.autopostingId})
    .then(postingItem => {
      // send response to user on messenger
      let messageData = {
        'recipient': {
          'id': req.body.entry[0].messaging[0].sender.id
        },
        'message': {
          'text': 'Your response has been submitted successfully!'
        }
      }
      facebookApiCaller('v3.3', `me/messages?access_token=${postingItem.approvalChannel.pageAccessToken}`, 'post', messageData)
        .then(response => {
          if (response.body.error) {
            logger.serverLog(TAG, `Failed to send approval message ${JSON.stringify(response.body.error)}`, 'error')
          } else {
            logger.serverLog(TAG, `Approval message send successfully!`)
          }
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to send approval message ${err}`, 'error')
        })

      utility.callApi('tweets_queue/query', 'post', query, '', 'kiboengage')
        .then(tweet => {
          if (payload.action === 'send_tweet') {
            req.body = tweet.tweet
            req.tweetUser = req.body.user
            if (req.body.quoted_status) {
              req.retweet = req.body.quoted_status
              req.quote = req.body.extended_tweet ? req.body.extended_tweet.full_text : req.body.text
              req.urls = req.body.extended_tweet ? req.body.extended_tweet.entities.urls : req.body.entities.urls
            } else if (req.body.retweeted_status) {
              req.retweet = req.body.retweeted_status
            } else {
              req.tweet = req.body
            }
            sendTweet(postingItem, req)
            deleteTweetQueue(query)
            AutopostingDataLayer.findOneAutopostingObjectAndUpdate({_id: postingItem._id}, {$inc: {tweetsForwarded: 1}}, {})
          } else if (payload.action === 'do_not_send_tweet') {
            deleteTweetQueue(query)
            AutopostingDataLayer.findOneAutopostingObjectAndUpdate({_id: postingItem._id}, {$inc: {tweetsIgnored: -1}}, {})
          }
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch tweet queue object ${err}`, 'error')
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch autoposting object ${err}`, 'error')
    })
}

const deleteTweetQueue = (query) => {
  query.purpose = 'deleteOne'
  utility.callApi('tweets_queue', 'delete', query, '', 'kiboengage')
    .then(deleted => {
      logger.serverLog(TAG, 'Tweet delete succssfully from queue')
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to delete tweet queue object ${err}`, 'error')
    })
}
