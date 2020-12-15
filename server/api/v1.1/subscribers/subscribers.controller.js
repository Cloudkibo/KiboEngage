const logicLayer = require('./subscribers.logiclayer')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v2/subscribers/subscribers.controller.js'
const needle = require('needle')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
let { sendOpAlert } = require('./../../global/operationalAlert')
const NewsSubscriptionsDataLayer = require('../newsSections/newsSubscriptions.datalayer')
const NewsSectionsDataLayer = require('../newsSections/newsSections.datalayer')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      utility.callApi(`subscribers/query`, 'post', { companyId: companyuser.companyId, isSubscribed: true, completeInfo: true }) // fetch subscribers of company
        .then(subscribers => {
          subscribers = subscribers.filter((subscriber) => subscriber.pageId.connected === true)
          let subscriberIds = logicLayer.getSubscriberIds(subscribers)
          utility.callApi(`tags_subscriber/query`, 'post', { subscriberId: { $in: subscriberIds } })
            .then(tags => {
              let subscribersPayload = logicLayer.getSusbscribersPayload(subscribers, tags)
              sendSuccessResponse(res, 200, subscribersPayload)
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to fetch tags subscribers ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch subscribers ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.allSubscribers = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      utility.callApi(`subscribers/query`, 'post', { companyId: companyuser.companyId, isEnabledByPage: true, completeInfo: true }) // fetch subscribers of company
        .then(subscribers => {
          let subscriberIds = logicLayer.getSubscriberIds(subscribers)
          utility.callApi(`tags_subscriber/query`, 'post', { subscriberId: { $in: subscriberIds } })
            .then(tags => {
              let subscribersPayload = logicLayer.getSusbscribersPayload(subscribers, tags)
              sendSuccessResponse(res, 200, subscribersPayload)
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.allSubscribers`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to fetch tags subscribers ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.allSubscribers`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch subscribers ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.allSubscribers`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.allLocales = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      let aggregateObject = [
        { $match: {companyId: req.user.companyId} },
        { $group: { _id: null, locales: { $addToSet: '$locale' } } }
      ]
      utility.callApi(`subscribers/aggregate`, 'post', aggregateObject) // fetch subscribers locales
        .then(locales => {
          sendSuccessResponse(res, 200, locales[0].locales)
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.allLocales`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch locales ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.allLocales`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.getCount = (req, res) => {
  if (req.body.tagValue) {
    utility.callApi(`tags/query`, 'post', { companyId: req.user.companyId, tag: { $in: req.body.tagValue } })
      .then(tags => {
        let tagIds = tags.map((t) => t._id)
        _getSubscribersCount(res, req.body, req.user.companyId, tagIds)
      })
      .catch(err => {
        const message = err || 'Failed to fetch tags'
        logger.serverLog(message, `${TAG}: exports.getCount`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 500, `Failed to fetch tags`)
      })
  } else {
    _getSubscribersCount(res, req.body, req.user.companyId)
  }
}

const _getSubscribersCount = (res, body, companyId, tagIds) => {
  logicLayer.getCountCriteria(body, companyId, tagIds)
    .then(criteria => {
      utility.callApi(`subscribers/aggregate`, 'post', criteria)
        .then(result => {
          if (result.length > 0) {
            sendSuccessResponse(res, 200, {count: result[0].count})
          } else {
            sendSuccessResponse(res, 200, {count: 0})
          }
        })
        .catch(err => {
          const message = err || 'Failed to fetch subscribers'
          logger.serverLog(message, `${TAG}: _getSubscribersCount`, body, {}, 'error')
          sendErrorResponse(res, 500, `Failed to fecth subscribers`)
        })
    })
}

const getAllSubscribers = function (subscribers, count, req, res) {
  var dt = new Date()
  var utcDate = dt.toUTCString()
  dt = new Date()
  utcDate = dt.toUTCString()
  let subscriberIds = logicLayer.getSubscriberIds(subscribers)
  utility.callApi(`tags/query`, 'post', { companyId: req.user.companyId })
    .then(tags => {
      dt = new Date()
      utcDate = dt.toUTCString()

      let tagIds = tags.map((t) => t._id)
      utility.callApi(`tags_subscriber/query`, 'post', { subscriberId: { $in: subscriberIds }, tagId: {$in: tagIds} })
        .then(tagSubscribers => {
          dt = new Date()
          utcDate = dt.toUTCString()
          let subscribersPayload = logicLayer.getSusbscribersPayload(subscribers, tagSubscribers, tagIds, req.body.filter_criteria.tag_value)
          // start append custom Fields
          utility.callApi('custom_fields/query', 'post', { purpose: 'findAll', match: { $or: [{companyId: req.user.companyId}, {default: true}] } })
            .then(customFields => {
              dt = new Date()
              utcDate = dt.toUTCString()
              let customFieldIds = customFields.map((cf) => cf._id)
              utility.callApi('custom_field_subscribers/query', 'post', {purpose: 'findAll', match: {subscriberId: {$in: subscriberIds}, customFieldId: {$in: customFieldIds}}})
                .then(customFieldSubscribers => {
                  dt = new Date()
                  utcDate = dt.toUTCString()
                  let finalPayload = logicLayer.getFinalPayload(subscribersPayload, customFields, customFieldSubscribers)
                  dt = new Date()
                  utcDate = dt.toUTCString()
                  sendSuccessResponse(res, 200, {subscribers: finalPayload, count: count.length > 0 ? count[0].count : 0})
                })
                .catch(error => {
                  const message = error || 'Internal Server Error'
                  logger.serverLog(message, `${TAG}: getAllSubscribers`, req.body, {user: req.user}, 'error')
                  sendErrorResponse(res, 500, `Failed to fetch custom_Field_subscribers ${JSON.stringify(error)}`)
                })
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: getAllSubscribers`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to fetch custom_Fields ${JSON.stringify(error)}`)
            })
        })
        // end append custom Fields
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: getAllSubscribers`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch tags subscribers ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: getAllSubscribers`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch tags ${JSON.stringify(error)}`)
    })
}
exports.getAll = function (req, res) {
  let tagIDs = []
  let tagValue = []
  if (req.body.filter_criteria.tag_value) {
    tagValue.push(req.body.filter_criteria.tag_value)
    utility.callApi(`tags/query`, 'post', { companyId: req.user.companyId, tag: { $in: tagValue } })
      .then(tags => {
        tagIDs = tags.map((tag) => tag._id)
        let criterias = logicLayer.getCriteriasTags(req, tagIDs)
        utility.callApi(`tags_subscriber/aggregate`, 'post', criterias.countCriteria) // fetch subscribers count
          .then(count => {
            utility.callApi(`tags_subscriber/aggregate`, 'post', criterias.fetchCriteria) // fetch subscribers count
              .then(subscribers => {
                let new_subscribers = []
                subscribers.forEach((subscriber, index) => {
                  let new_subscriber = subscriber.Subscribers
                  new_subscriber.pageId = subscriber.pageId
                  new_subscribers.push(new_subscriber)
                })
                getAllSubscribers(new_subscribers, count, req, res)
              })
              .catch(err => {
                const message = err || 'Failed to fetch subscriber data'
                logger.serverLog(message, `${TAG}: exports.getAll`, req.body, {user: req.user}, 'error')
              })
          })
          .catch(err => {
            const message = err || 'Failed to fetch subscriber count'
            logger.serverLog(message, `${TAG}: exports.getAll`, req.body, {user: req.user}, 'error')
          })
      })
      .catch(err => {
        const message = err || 'Failed to fetch tag'
        logger.serverLog(message, `${TAG}: exports.getAll`, req.body, {user: req.user}, 'error')
      })
  } else {
    let criterias = logicLayer.getCriterias(req, tagIDs)
    utility.callApi(`subscribers/aggregate`, 'post', criterias.countCriteria) // fetch subscribers count
      .then(count => {
        utility.callApi(`subscribers/aggregate`, 'post', criterias.fetchCriteria) // fetch subscribers
          .then(subscribers => {
            getAllSubscribers(subscribers, count, req, res)
          })
          .catch(error => {
            const message = error || 'Failed to fetch subscribers'
            logger.serverLog(message, `${TAG}: exports.getAll`, req.body, {user: req.user}, 'error')
          })
      })
      .catch(error => {
        sendErrorResponse(res, 500, `Failed to fetch subscriber count ${JSON.stringify(error)}`)
      })
  }
}

exports.subscribeBack = function (req, res) {
  utility.callApi(`subscribers/update`, 'put', { query: { _id: req.params.id, unSubscribedBy: 'agent' }, newPayload: { isSubscribed: true, unSubscribedBy: 'subscriber' }, options: {} }) // fetch single subscriber
    .then(subscriber => {
      subscribeNewsSubscription(req.params.id, req.user.companyId)
      sendSuccessResponse(res, 200, subscriber)
    })
    .catch(error => {
      const message = error || 'Failed to fetch subscriber'
      logger.serverLog(message, `${TAG}: exports.subscribeBack`, req.body, {user: req.user}, 'error')
    })
}

exports.updatePicture = function (req, res) {
  utility.callApi('subscribers/updatePicture', 'post', req.body)
    .then(update => {
      sendSuccessResponse(res, 200, update)
    })
    .catch(err => {
      const message = err || 'Unable to update picture'
      logger.serverLog(message, `${TAG}: exports.updatePicture`, req.body, {user: req.user}, 'debug')
      sendErrorResponse(res, 500, `Failed to update subscriber data ${JSON.stringify(err)}`)
    })
}

exports.updateData = function (req, res) {
  utility.callApi('subscribers/updateData', 'get', {})
    .then(updatedSubscribers => {
      sendSuccessResponse(res, 200, updatedSubscribers)
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.updateData`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch subscribers ${JSON.stringify(err)}`)
    })
}
exports.unSubscribe = function (req, res) {
  let companyUser = {}
  let userPage = {}
  let subscriber = {}
  let updated = {}

  let pageResponse = utility.callApi(`pages/${req.body.page_id}`, 'get', {}, 'accounts', req.headers.authorization)
  let subscriberResponse = utility.callApi(`subscribers/${req.body.subscriber_id}`, 'get', {})
  let updateSubscriberResponse = utility.callApi(`subscribers/update`, 'put', {
    query: { _id: req.body.subscriber_id },
    newPayload: { isSubscribed: false, unSubscribedBy: 'agent' },
    options: {}
  })

  pageResponse.then(page => {
    userPage = page
    return subscriberResponse
  })
    .then(subscriberData => {
      subscriber = subscriberData
      return updateSubscriberResponse
    })
    .then(updatedData => {
      updated = updatedData
      saveNotifications(companyUser, subscriber, req)
      return utility.callApi(`user/query`, 'post', { _id: userPage.userId._id })
    })
    .then(connectedUser => {
      connectedUser = connectedUser[0]
      var currentUser
      if (req.user.facebookInfo) {
        currentUser = req.user
      } else {
        currentUser = connectedUser
      }
      unSubscribeNewsSubscription(subscriber)
      needle.get(
        `https://graph.facebook.com/v6.0/${userPage.pageId}?fields=access_token&access_token=${currentUser.facebookInfo.fbToken}`,
        (err, resp) => {
          if (err) {
            const message = err || 'Page access token from graph api error'
            logger.serverLog(message, `${TAG}: exports.unSubscribe`, req.body, {user: req.user}, 'error')
          }
          if (resp.body.error) {
            sendOpAlert(resp.body.error, 'subscribers controller in kiboengage', req.body.page_id, userPage.userId._id, '')
          }
          const messageData = {
            text: 'We have unsubscribed you from our page. We will notify you when we subscribe you again. Thanks'
          }
          const data = {
            messaging_type: 'UPDATE',
            recipient: JSON.stringify({ id: subscriber.senderId }), // this is the subscriber id
            message: messageData
          }
          needle.post(
            `https://graph.facebook.com/v6.0/me/messages?access_token=${resp.body.access_token}`,
            data, (err, resp) => {
              if (err) {
                const message = err || 'Internal Server Error'
                logger.serverLog(message, `${TAG}: exports.unSubscribe`, req.body, {user: req.user}, 'error')
                sendErrorResponse(res, 500, '', JSON.stringify(err))
              }
              if (resp.body.error) {
                sendOpAlert(resp.body.error, 'subscribers controller in kiboengage', '', '', '')
              }
              require('./../../../config/socketio').sendMessageToClient({
                room_id: req.user.companyId,
                body: {
                  action: 'unsubscribe',
                  payload: {
                    subscriber_id: req.body.subscriber_id,
                    user_id: req.user._id,
                    user_name: req.user.name
                  }
                }
              })
              sendSuccessResponse(res, 200, updated)
            })
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.unSubscribe`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch user ${JSON.stringify(err)}`)
    })
}
function saveNotifications (companyUser, subscriber, req) {
  let notificationsData = {
    message: `Subscriber ${subscriber.firstName + ' ' + subscriber.lastName} has been unsubscribed by ${req.user.name}`,
    category: { type: 'unsubscribe', id: subscriber._id },
    agentId: req.user._id,
    companyId: subscriber.companyId
  }
  utility.callApi('notifications', 'post', notificationsData, 'kibochat')
    .then(savedNotification => { })
    .catch(error => {
      const message = error || 'Failed to create notification'
      logger.serverLog(message, `${TAG}: saveNotifications`, req.body, {user: req.user}, 'error')
    })
}
function subscribeNewsSubscription (subscriberId, companyId) {
  NewsSectionsDataLayer.genericFindForRssFeeds({companyId: companyId, defaultFeed: true})
    .then(newsSections => {
      if (newsSections.length > 0) {
        let newsSectionIds = newsSections.map(n => n._id)
        NewsSubscriptionsDataLayer.genericUpdateRssSubscriptions(
          {'subscriberId._id': subscriberId, subscription: false, newsSectionId: {$in: newsSectionIds}},
          {subscription: true}, {})
          .then(updated => {
          })
          .catch(err => {
            const message = err || 'Failed to update subscription'
            logger.serverLog(message, `${TAG}: subscribeNewsSubscription`, {subscriberId, companyId}, {}, 'error')
          })
        NewsSectionsDataLayer.genericUpdateRssFeed({_id: {$in: newsSectionIds}}, {$inc: {subscriptions: 1}}, {})
          .then(updated => {
          })
          .catch(err => {
            const message = err || 'Failed to update subscription count'
            logger.serverLog(message, `${TAG}: subscribeNewsSubscription`, {subscriberId, companyId}, {}, 'error')
          })
      }
    })
    .catch(err => {
      const message = err || 'Failed to update subscriber'
      logger.serverLog(message, `${TAG}: subscribeNewsSubscription`, {subscriberId, companyId}, {}, 'error')
    })
}

function unSubscribeNewsSubscription (subscriber) {
  NewsSectionsDataLayer.genericFindForRssFeeds({defaultFeed: true, companyId: subscriber.companyId})
    .then(defaultNewsSections => {
      NewsSubscriptionsDataLayer.genericFindForRssSubscriptions({'subscriberId._id': subscriber._id})
        .then(newsSubscriptions => {
          if (newsSubscriptions.length > 0) {
            let subscriptionIds = newsSubscriptions.filter(n => n.subscription === true).map(s => s._id)
            let newsIds = newsSubscriptions.filter(a => a.subscription === true).map(n => n.newsSectionId)
            updateSubscription({_id: {$in: subscriptionIds}})
            updateSubscriptionCount({_id: {$in: newsIds}})
            let defaultSubscriptions = []
            let defaultNewsSectionIds = defaultNewsSections.map(a => a._id)
            let newsSubscriptionsIds = newsSubscriptions.map(n => n.newsSectionId)
            defaultSubscriptions = defaultNewsSectionIds.filter((item) => !newsSubscriptionsIds.includes(item))
            if (defaultSubscriptions.length > 0) {
              updateSubscriptionCount({_id: {$in: defaultSubscriptions}})
            }
          } else {
            updateSubscriptionCount({defaultFeed: true, companyId: subscriber.companyId})
          }
        })
        .catch(err => {
          const message = err || 'Failed to fetch subscriptions'
          logger.serverLog(message, `${TAG}: unSubscribeNewsSubscription`, {subscriber}, {}, 'error')
        })
    })
    .catch(err => {
      const message = err || 'Failed to default feeds'
      logger.serverLog(message, `${TAG}: unSubscribeNewsSubscription`, {subscriber}, {}, 'error')
    })
}
function updateSubscriptionCount (query) {
  NewsSectionsDataLayer.genericUpdateRssFeed(query, {$inc: {subscriptions: -1}}, {})
    .then(updated => {
    })
    .catch(err => {
      const message = err || 'Failed to update subscription count for default'
      logger.serverLog(message, `${TAG}: updateSubscriptionCount`, {query}, {}, 'error')
    })
}

function updateSubscription (query) {
  NewsSubscriptionsDataLayer.genericUpdateRssSubscriptions(query, {subscription: false}, {})
    .then(updated => {
    })
    .catch(err => {
      const message = err || 'Failed to update subscriptions'
      logger.serverLog(message, `${TAG}: updateSubscription`, {query}, {}, 'error')
    })
}
