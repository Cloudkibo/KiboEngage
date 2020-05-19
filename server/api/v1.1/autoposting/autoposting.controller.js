const AutopostingDataLayer = require('./autoposting.datalayer')
const AutoPostingLogicLayer = require('./autoposting.logiclayer')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/autoposting/autoposting.controller'
const { sendTweet } = require('../twitterEvents/twitter.controller')
const { facebookApiCaller } = require('../../global/facebookApiCaller')
const feedparser = require('feedparser-promised')
const async = require('async')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const { getScheduledTime } = require('../../global/utility')
let { sendOpAlert } = require('./../../global/operationalAlert')
const { updateCompanyUsage } = require('../../global/billingPricing')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      console.log('statusArrayinController', req.user.SMPStatus)
      AutopostingDataLayer.findAllAutopostingObjectsUsingQuery({ companyId: companyUser.companyId }, req.headers.authorization)
        .then(autoposting => {
          let data = {
            autoposting: autoposting,
            SMPStatus: req.user.SMPStatus
          }
          sendSuccessResponse(res, 200, data)
        })
        .catch(err => {
          sendErrorResponse(res, 500, '', `Internal Server Error while fetching autoposting${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
    })
}

const _fetchCompanyUser = (data, next) => {
  utility.callApi(`companyUser/query`, 'post', { domain_email: data.user.domain_email, populate: 'companyId' })
    .then(companyUser => {
      if (!companyUser) {
        next('No account found')
      } else {
        data.companyUser = companyUser
        next(null, data)
      }
    })
    .catch(err => {
      next(err)
    })
}

const _fetchPlanUsage = (data, next) => {
  utility.callApi(`featureUsage/planQuery`, 'post', { planId: data.companyUser.companyId.planId })
    .then(planUsage => {
      data.planUsage = planUsage
      next()
    })
    .catch(err => {
      next(err)
    })
}

const _fetchCompanyUsage = (data, next) => {
  utility.callApi('featureUsage/companyQuery', 'post', { companyId: data.companyUser.companyId._id })
    .then(companyUsage => {
      data.companyUsage = companyUsage
      next()
    })
    .catch(err => {
      next(err)
    })
}

const _countAutoposting = (data, next) => {
  AutopostingDataLayer.countAutopostingDocuments({ companyId: data.companyUser.companyId._id, subscriptionType: data.subscriptionType })
    .then(gotCount => {
      if (gotCount > 0 && !data.companyUser.enableMoreAutoPostingIntegration) {
        next('Cannot add more integrations. Please contact support or remove existing ones')
      } else {
        next()
      }
    })
    .catch(err => {
      next(err)
    })
}

const _checkAutopostingExistStatus = (data, next) => {
  AutopostingDataLayer.findAllAutopostingObjectsUsingQuery({ companyId: data.companyUser.companyId._id, subscriptionUrl: data.subscriptionUrl })
    .then(autoposting => {
      if (autoposting && autoposting.length > 0) {
        next('Feed already exist')
      } else {
        next()
      }
    })
    .catch(err => {
      next(err)
    })
}

const _addTwitterAccount = (data, next) => {
  let autoPostingPayload = data.autoPostingPayload
  let url = data.subscriptionUrl
  let urlAfterDot = url.substring(url.indexOf('.') + 1)
  let screenName = urlAfterDot.substring(urlAfterDot.indexOf('/') + 1)
  if (screenName.indexOf('/') > -1) screenName = screenName.substring(0, screenName.length - 1)
  AutoPostingLogicLayer.findUser(screenName, (err, twitter) => {
    if (err) {
      logger.serverLog(TAG, `Twitter URL parse Error ${err}`, 'error')
    }
    let payload
    if (twitter && !twitter.errors) {
      autoPostingPayload.accountUniqueName = twitter.screen_name
      payload = {
        id: twitter.id_str,
        name: twitter.name,
        screen_name: twitter.screen_name,
        profile_image_url: twitter.profile_image_url_https
      }
      autoPostingPayload.payload = payload
      AutopostingDataLayer.createAutopostingObject(autoPostingPayload)
        .then(result => {
          updateCompanyUsage(data.companyUser.companyId._id, 'twitter_autoposting', 1)
          utility.callApi('featureUsage/updateCompany', 'put', { query: { companyId: data.companyUser.companyId._id }, newPayload: { $inc: { twitter_autoposting: 1 } }, options: {} })
            .then(updated => {
              data.result = result
              next()
            })
            .catch(err => {
              logger.serverLog(TAG, err, 'error')
              next(err)
            })
          utility.callApi('twitter/restart', 'get', {}, 'webhook')
          require('./../../../config/socketio').sendMessageToClient({
            room_id: data.companyUser.companyId._id,
            body: {
              action: 'autoposting_created',
              payload: {
                autoposting_id: result._id,
                user_id: data.user._id,
                user_name: data.user.name,
                payload: result
              }
            }
          })
        })
        .catch(err => {
          logger.serverLog(TAG, err, 'error')
          next(err)
        })
    } else {
      next('Twitter account not found.')
    }
  })
}

const _addFacebookAccount = (data, next) => {
  let autoPostingPayload = data.autoPostingPayload
  let screenName = AutoPostingLogicLayer.getFacebookScreenName(data.subscriptionUrl)
  if (screenName) {
    utility.callApi(`pages/query`, 'post', { companyId: data.user.companyId, $or: [{ pageId: screenName }, { pageUserName: screenName }] })
      .then(pagesInfo => {
        let pageInfo = pagesInfo[0]
        if (!pageInfo) {
          next('Facebook page not found.')
        }
        autoPostingPayload.accountUniqueName = pageInfo.pageId
        AutopostingDataLayer.createAutopostingObject(autoPostingPayload)
          .then(result => {
            updateCompanyUsage(data.companyUser.companyId._id, 'facebook_autoposting', 1)
            utility.callApi('featureUsage/updateCompany', 'put', { query: { companyId: data.companyUser.companyId._id }, newPayload: { $inc: { facebook_autoposting: 1 } }, options: {} })
              .then(updated => {
                data.result = result
                next()
              })
              .catch(err => {
                logger.serverLog(TAG, err, 'error')
                next(err)
              })
            require('./../../../config/socketio').sendMessageToClient({
              room_id: data.companyUser.companyId._id,
              body: {
                action: 'autoposting_created',
                payload: {
                  autoposting_id: result._id,
                  user_id: data.user._id,
                  user_name: data.user.name,
                  payload: result
                }
              }
            })
          })
          .catch(err => {
            logger.serverLog(TAG, err, 'error')
            next(err)
          })
      })
      .catch(err => {
        logger.serverLog(TAG, err, 'error')
        next(err)
      })
  } else {
    next('Invalid url provided.')
  }
}

const _addYouTubeAccount = (data, next) => {
  let autoPostingPayload = data.autoPostingPayload
  let channelName = AutoPostingLogicLayer.getChannelName(data.subscriptionUrl)
  autoPostingPayload.accountUniqueName = channelName
  AutopostingDataLayer.createAutopostingObject(autoPostingPayload)
    .then(result => {
      data.result = result
      next()
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
      next(err)
    })
}

const _addRSSFeed = (data, next) => {
  let autoPostingPayload = data.autoPostingPayload
  autoPostingPayload.scheduledInterval = '24 hours'
  autoPostingPayload.scheduledTime = getScheduledTime('24 hours')
  feedparser.parse(data.subscriptionUrl)
    .then(feed => {
      if (feed) {
        AutopostingDataLayer.createAutopostingObject(autoPostingPayload)
          .then(result => {
            data.result = result
            next()
          })
          .catch(err => {
            logger.serverLog(TAG, err, 'error')
            next(err)
          })
      } else {
        next('Invalid feed url provided.')
      }
    })
    .catch(err => {
      next(err)
    })
}

const _addWordpressAccount = (data, next) => {
  let autoPostingPayload = data.autoPostingPayload
  let url = data.subscriptionUrl
  let wordpressUniqueId = url.split('/')[0] + url.split('/')[1] + '//' + url.split('/')[2]
  autoPostingPayload.accountUniqueName = wordpressUniqueId
  AutopostingDataLayer.createAutopostingObject(autoPostingPayload)
    .then(result => {
      updateCompanyUsage(data.companyUser.companyId._id, 'wordpress_autoposting', 1)
      utility.callApi('featureUsage/updateCompany', 'put', { query: { companyId: data.companyUser.companyId._id }, newPayload: { $inc: { wordpress_autoposting: 1 } }, options: {} })
        .then(result => {
          require('./../../../config/socketio').sendMessageToClient({
            room_id: data.companyUser.companyId._id,
            body: {
              action: 'autoposting_created',
              payload: {
                autoposting_id: result._id,
                user_id: data.user._id,
                user_name: data.user.name,
                payload: result
              }
            }
          })
          data.result = result
          next()
        })
        .catch(err => {
          next(err)
        })
    })
}

const _createAutoposting = (data, next) => {
  if (data.subscriptionType === 'twitter') {
    _addTwitterAccount(data, next)
  } else if (data.subscriptionType === 'facebook') {
    _addFacebookAccount(data, next)
  } else if (data.subscriptionType === 'youtube') {
    _addYouTubeAccount(data, next)
  } else if (data.subscriptionType === 'rss') {
    _addRSSFeed(data, next)
  } else if (data.subscriptionType === 'wordpress') {
    _addWordpressAccount(data, next)
  }
}

exports.create = function (req, res) {
  let data = {
    user: req.user,
    subscriptionType: req.body.subscriptionType,
    subscriptionUrl: req.body.subscriptionUrl,
    autoPostingPayload: AutoPostingLogicLayer.prepareAutopostingPayload(req)
  }
  async.series([
    _fetchCompanyUser.bind(null, data),
    _fetchPlanUsage.bind(null, data),
    _fetchCompanyUsage.bind(null, data),
    _countAutoposting.bind(null, data),
    _checkAutopostingExistStatus.bind(null, data),
    _createAutoposting.bind(null, data)
  ], function (err) {
    if (err) {
      logger.serverLog(TAG, `Failed to create autoposting. ${JSON.stringify(err)}`)
      // console.log('Failed to create autoposting', err)
      sendErrorResponse(res, 500, '', err)
    } else {
      sendSuccessResponse(res, 200, data.result)
    }
  })
}

exports.edit = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      var autoposting = AutoPostingLogicLayer.prepareEditPayload(req)
      if (req.body.subscriptionType === 'rss') {
        autoposting.scheduledTime = getScheduledTime(autoposting.scheduledInterval)
      }
      AutopostingDataLayer.genericFindByIdAndUpdate({ _id: req.body._id }, autoposting)
        .then(autopostingUpdated => {
          if (!autoposting) {
            sendErrorResponse(res, 404, '', 'Record not found')
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
          sendSuccessResponse(res, 200, autopostingUpdated)
        })
        .catch(err => {
          sendErrorResponse(res, 500, '', `Internal Server Error while fetching autoposting${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
    })
}

function decrementCompanyUsage (autoposting) {
  switch (autoposting.subscriptionType) {
    case 'facebook':
      updateCompanyUsage(autoposting.companyId, 'facebook_autoposting', -1)
      break
    case 'twitter':
      updateCompanyUsage(autoposting.companyId, 'twitter_autoposting', -1)
      break
    case 'wordpress':
      updateCompanyUsage(autoposting.companyId, 'wordpress_autoposting', -1)
      break
    default:
  }
}

exports.destroy = function (req, res) {
  AutopostingDataLayer.findOneAutopostingObject(req.params.id, req.user.companyId)
    .then(autoposting => {
      decrementCompanyUsage(autoposting)
      if (!autoposting) {
        sendErrorResponse(res, 404, '', 'Record not found')
      }
      AutopostingDataLayer.deleteAutopostingObject(autoposting._id)
        .then(result => {
          utility.callApi('twitter/restart', 'get', {}, 'webhook')
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
          sendSuccessResponse(res, 200, '', 'AutoPosting deleted successfully!')
        })
        .catch(err => {
          sendErrorResponse(res, 500, '', `AutoPosting update failed ${err}`)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Internal Server Error in fetching autoposting object  ${err}`)
    })
}

exports.handleTweetModeration = function (req, res) {
  sendSuccessResponse(res, 200, 'Received the event')
  const payload = JSON.parse(req.body.entry[0].messaging[0].postback.payload)
  let query = {
    purpose: 'findOne',
    match: {
      autopostingId: payload.autopostingId,
      'tweet.id_str': payload.tweetId
    }
  }
  AutopostingDataLayer.findOneAutopostingObjectUsingQuery({ _id: payload.autopostingId })
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
            sendOpAlert(response.body.error, 'autoposting controller in kiboengage', '', '', '')
            logger.serverLog(TAG, `Approval message send successfully!`)
          }
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to send approval message ${err}`, 'error')
        })

      utility.callApi('tweets_queue/query', 'post', query, 'kiboengage')
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
            AutopostingDataLayer.findOneAutopostingObjectAndUpdate({ _id: postingItem._id }, { $inc: { tweetsForwarded: 1 } }, {})
          } else if (payload.action === 'do_not_send_tweet') {
            deleteTweetQueue(query)
            AutopostingDataLayer.findOneAutopostingObjectAndUpdate({ _id: postingItem._id }, { $inc: { tweetsIgnored: -1 } }, {})
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
  utility.callApi('tweets_queue', 'delete', query, 'kiboengage')
    .then(deleted => {
      logger.serverLog(TAG, 'Tweet delete succssfully from queue')
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to delete tweet queue object ${err}`, 'error')
    })
}
