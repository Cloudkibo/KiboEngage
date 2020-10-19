const logicLayer = require('./pages.logiclayer')
const utility = require('../utility')
const needle = require('needle')
const logger = require('../../../components/logger')
const TAG = 'api/v2/pages/pages.controller.js'
const broadcastUtility = require('../broadcasts/broadcasts.utility')
const AutopostingDataLayer = require('../autoposting/autoposting.datalayer')
let config = require('./../../../config/environment')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
let { sendOpAlert } = require('./../../global/operationalAlert')
const { updateCompanyUsage } = require('../../global/billingPricing')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      utility.callApi(`pages/query`, 'post', { companyId: companyuser.companyId }) // fetch all pages of company
        .then(pages => {
          let pagesToSend = logicLayer.removeDuplicates(pages)
          sendSuccessResponse(res, 200, pagesToSend)
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch pages ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.allPages = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      utility.callApi(`pages/query`, 'post', { connected: true, companyId: companyuser.companyId }) // fetch connected pages
        .then(pages => {
          let subscribeAggregate = [
            { $match: { isSubscribed: true, completeInfo: true } },
            {
              $group: {
                _id: { pageId: '$pageId' },
                count: { $sum: 1 }
              }
            }
          ]
          utility.callApi(`subscribers/aggregate`, 'post', subscribeAggregate)
            .then(subscribesCount => {
              let unsubscribeAggregate = [
                { $match: { isSubscribed: false, completeInfo: true } },
                {
                  $group: {
                    _id: { pageId: '$pageId' },
                    count: { $sum: 1 }
                  }
                }
              ]
              utility.callApi(`subscribers/aggregate`, 'post', unsubscribeAggregate)
                .then(unsubscribesCount => {
                  let updatedPages = logicLayer.appendSubUnsub(pages)
                  updatedPages = logicLayer.appendSubscribersCount(updatedPages, subscribesCount)
                  updatedPages = logicLayer.appendUnsubscribesCount(updatedPages, unsubscribesCount)
                  sendSuccessResponse(res, 200, updatedPages)
                })
                .catch(error => {
                  sendErrorResponse(res, 500, `Failed to fetch unsubscribes ${JSON.stringify(error)}`)
                })
            })
            .catch(error => {
              sendErrorResponse(res, 500, `Failed to fetch subscribes ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch connected pages ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.connectedPages = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      let criterias = logicLayer.getCriterias(req.body, companyuser)
      utility.callApi(`pages/aggregate`, 'post', criterias.countCriteria) // fetch connected pages count
        .then(count => {
          utility.callApi(`pages/aggregate`, 'post', criterias.fetchCriteria) // fetch connected pages
            .then(pages => {
              let subscribeAggregate = [
                { $match: { isSubscribed: true, completeInfo: true } },
                {
                  $group: {
                    _id: { pageId: '$pageId' },
                    count: { $sum: 1 }
                  }
                }
              ]
              utility.callApi(`subscribers/aggregate`, 'post', subscribeAggregate)
                .then(subscribesCount => {
                  let unsubscribeAggregate = [
                    { $match: { isSubscribed: false, completeInfo: true } },
                    {
                      $group: {
                        _id: { pageId: '$pageId' },
                        count: { $sum: 1 }
                      }
                    }
                  ]
                  utility.callApi(`subscribers/aggregate`, 'post', unsubscribeAggregate)
                    .then(unsubscribesCount => {
                      let updatedPages = logicLayer.appendSubUnsub(pages)
                      updatedPages = logicLayer.appendSubscribersCount(updatedPages, subscribesCount)
                      updatedPages = logicLayer.appendUnsubscribesCount(updatedPages, unsubscribesCount)
                      sendSuccessResponse(res, 200, { pages: updatedPages, count: count.length > 0 ? count[0].count : 0 })
                    })
                    .catch(error => {
                      sendErrorResponse(res, 500, `Failed to fetch unsubscribes ${JSON.stringify(error)}`)
                    })
                })
                .catch(error => {
                  sendErrorResponse(res, 500, `Failed to fetch subscribes ${JSON.stringify(error)}`)
                })
            })
            .catch(error => {
              sendErrorResponse(res, 500, `Failed to fetch connected pages ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch connected pages count ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.enable = function (req, res) {
  utility.callApi('companyuser/query', 'post', { domain_email: req.user.domain_email, populate: 'companyId' })
    .then(companyUser => {
      utility.callApi(`featureUsage/planQuery`, 'post', { planId: companyUser.companyId.planId })
        .then(planUsage => {
          planUsage = planUsage[0]
          utility.callApi(`featureUsage/companyQuery`, 'post', { companyId: companyUser.companyId._id })
            .then(companyUsage => {
              companyUsage = companyUsage[0]
              if (planUsage.facebook_pages !== -1 && companyUsage.facebook_pages >= planUsage.facebook_pages) {
                return res.status(500).json({
                  status: 'failed',
                  description: `Your pages limit has reached. Please upgrade your plan to connect more pages.`
                })
              }
              utility.callApi(`pages/${req.body._id}`, 'get', {}) // fetch page
                .then(page => {
                  needle('get', `https://graph.facebook.com/v6.0/me?access_token=${page.accessToken}`)
                    .then(response => {
                      if (response.body.error) {
                        sendOpAlert(response.body.error, 'pages controller in kiboengage', page._id, page.userId, page.companyId)
                        return res.status(400).json({ status: 'failed', payload: response.body.error.message, type: 'invalid_permissions' })
                      } else {
                        utility.callApi(`pages/query`, 'post', { pageId: req.body.pageId, connected: true })
                          .then(pageConnected => {
                            if (pageConnected.length === 0) {
                              let query = {
                                connected: true,
                                isWelcomeMessageEnabled: true,
                                welcomeMessage: [
                                  {
                                    id: 0,
                                    componentType: 'text',
                                    text: 'Hi {{user_full_name}}! Thanks for getting in touch with us on Messenger. Please send us any questions you may have'
                                  }]
                              }
                              Object.assign(req.body, query)
                              utility.callApi('pages/query', 'post', { _id: req.body._id })
                                .then(pages => {
                                  let page = pages[0]

                                  query.welcomeMessage = page.welcomeMessage ? page.welcomeMessage : query.welcomeMessage
                                  // initiate reach estimation
                                  // needle('post', `https://graph.facebook.com/v6.0/me/broadcast_reach_estimations?access_token=${page.accessToken}`)
                                  //   .then(reachEstimation => {
                                  //     if (reachEstimation.body.error) {
                                  //       sendOpAlert(reachEstimation.body.error, 'pages controller in kiboengage', page._id, page.userId, page.companyId)
                                  //     }
                                  //     console.log('reachEstimation response', reachEstimation.body)
                                  //     if (reachEstimation.body.reach_estimation_id) {
                                  // query.reachEstimationId = reachEstimation.body.reach_estimation_id
                                  utility.callApi(`pages/${req.body._id}`, 'put', query) // connect page
                                    .then(connectPage => {
                                      utility.callApi(`featureUsage/updateCompany`, 'put', {
                                        query: { companyId: req.body.companyId },
                                        newPayload: { $inc: { facebook_pages: 1 } },
                                        options: {}
                                      })
                                        .then(updated => {
                                          // console.log('update company')
                                        })
                                        .catch(error => {
                                          sendErrorResponse(res, 500, `Failed to update company usage ${JSON.stringify(error)}`)
                                        })
                                      utility.callApi(`subscribers/update`, 'put', { query: { pageId: page._id }, newPayload: { isEnabledByPage: true }, options: {} }) // update subscribers
                                        .then(updatedSubscriber => {
                                          // eslint-disable-next-line no-unused-vars
                                          const options = {
                                            url: `https://graph.facebook.com/v6.0/${page.pageId}/subscribed_apps?access_token=${page.accessToken}`,
                                            qs: { access_token: page.accessToken },
                                            method: 'POST'
                                          }
                                          let bodyToSend = {
                                            subscribed_fields: [
                                              'feed', 'conversations', 'mention', 'messages', 'message_echoes', 'message_deliveries', 'messaging_optins', 'messaging_postbacks', 'message_reads', 'messaging_referrals', 'messaging_policy_enforcement']
                                          }
                                          needle.post(`https://graph.facebook.com/v3.2/me/subscribed_apps?access_token=${page.accessToken}`, bodyToSend, (error, response) => {
                                            console.log('response.body', response.body)
                                            if (error) {
                                              console.log('error in subscribed_apps', error)
                                              sendErrorResponse(res, 5000, JSON.stringify(error))
                                            }
                                            if (response.body.error) {
                                              sendOpAlert(response.body.error, 'pages controller in kiboengage', page._id, page.userId, page.companyId)
                                            }
                                            if (response.body.success) {
                                              let updateConnectedFacebook = { query: { pageId: page.pageId }, newPayload: { connectedFacebook: true }, options: { multi: true } }
                                              utility.callApi(`pages/update`, 'post', updateConnectedFacebook) // connect page
                                                .then(updatedPage => {
                                                })
                                                .catch(error => {
                                                  logger.serverLog(TAG,
                                                    `Failed to updatedPage ${JSON.stringify(error)}`, 'error')
                                                })
                                            }
                                            var valueForMenu = {
                                              'get_started': {
                                                'payload': '<GET_STARTED_PAYLOAD>'
                                              },
                                              'greeting': [
                                                {
                                                  'locale': 'default',
                                                  'text': 'Hi {{user_full_name}}! Please tap on getting started to start the conversation.'
                                                }]
                                            }
                                            const requesturl = `https://graph.facebook.com/v6.0/me/messenger_profile?access_token=${page.accessToken}`
                                            needle.request('post', requesturl, valueForMenu,
                                              { json: true }, function (err, resp) {
                                                if (err) {
                                                  logger.serverLog(TAG,
                                                    `Internal Server Error ${JSON.stringify(
                                                      err)}`, 'debug')
                                                }
                                                if (resp.body.error) {
                                                  const errorMessage = resp.body.error.message
                                                  if (errorMessage && errorMessage.includes('administrative permission')) {
                                                    sendSuccessResponse(res, 200, { adminError: 'Page connected successfully, but certain actions such as setting welcome message will not work due to your page role' })
                                                  } else {
                                                    _updateWhitlistDomain(req, page)
                                                    sendSuccessResponse(res, 200, 'Page connected successfully')
                                                  }
                                                  // sendOpAlert(resp.body.error, 'pages controller in kiboengage', page._id, page.userId, page.companyId)
                                                } else {
                                                  _updateWhitlistDomain(req, page)
                                                  sendSuccessResponse(res, 200, 'Page connected successfully')
                                                }
                                              })
                                            require('./../../../config/socketio').sendMessageToClient({
                                              room_id: req.body.companyId,
                                              body: {
                                                action: 'page_connect',
                                                payload: {
                                                  data: req.body,
                                                  company_id: req.body.companyId
                                                }
                                              }
                                            })
                                          })
                                        })
                                        .catch(error => {
                                          sendErrorResponse(res, 500, `Failed to update subscriber ${JSON.stringify(error)}`)
                                        })
                                    })
                                    .catch(error => {
                                      sendErrorResponse(res, 500, `Failed to connect page ${JSON.stringify(error)}`)
                                    })
                                  //   } else {
                                  //     logger.serverLog(TAG, `Failed to start reach estimation`, 'error')
                                  //   }
                                  // })
                                  // .catch(err => {
                                  //   logger.serverLog(TAG, `Error at find page ${err}`, 'error')
                                  // })
                                })
                                .catch(err => {
                                  logger.serverLog(TAG, `Error at find page ${err}`, 'error')
                                  sendErrorResponse(res, 500, err)
                                })
                            } else {
                              sendSuccessResponse(res, 200, { msg: `Page is already connected by ${pageConnected[0].userId.facebookInfo.name} (${pageConnected[0].userId.email}).` })
                            }
                          })
                      }
                    })
                    .catch(error => {
                      sendErrorResponse(res, 500, `Failed to check page token ${JSON.stringify(error)}`)
                    })
                })
                .catch(error => {
                  sendErrorResponse(res, 500, `Failed to fetch page ${JSON.stringify(error)}`)
                })
            })
            .catch(error => {
              sendErrorResponse(res, 500, `Failed to fetch company usage ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch plan usage ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

const _updateWhitlistDomain = (req, page) => { 
  console.log('page.pageId in _updateWhitlistDomain ', page.pageId)
  console.log('page.pageId in config.domain ', config.domain)
  utility.callApi(`pages/whitelistDomain`, 'post', { page_id: page.pageId, whitelistDomains: [`${config.domain}`] }, 'accounts', req.headers.authorization)
  .then(whitelistDomains => {
  })
  .catch(error => {
    logger.serverLog(TAG,
      `Failed to whitelist domain ${JSON.stringify(error)}`, 'error')
  })
}
exports.disable = function (req, res) {
  utility.callApi(`pages/${req.body._id}`, 'put', { connected: false }) // disconnect page
    .then(disconnectPage => {
      updateCompanyUsage(req.user.companyId, 'facebook_pages', -1)
      logger.serverLog(TAG, 'updated page successfully', 'debug')
      utility.callApi(`subscribers/update`, 'put', { query: { pageId: req.body._id }, newPayload: { isEnabledByPage: false }, options: { multi: true } }) // update subscribers
        .then(updatedSubscriber => {
          const options = {
            url: `https://graph.facebook.com/v6.0/${req.body.pageId}/subscribed_apps?access_token=${req.body.accessToken}`,
            qs: { access_token: req.body.accessToken },
            method: 'DELETE'
          }
          needle.delete(options.url, options, (error, response) => {
            if (error) {
              sendErrorResponse(res, 500, JSON.stringify(error))
            }
            if (response.body.error) {
              sendOpAlert(response.body.error, 'pages controller in kiboengage', '', '', '')
            }
            if (response.body.success) {
              utility.callApi(`pages/${req.body._id}`, 'get', {}) // fetch page
                .then(page => {
                  let updateConnectedFacebook = { query: { pageId: page.pageId }, newPayload: { connectedFacebook: false }, options: { multi: true } }
                  utility.callApi(`pages/update`, 'post', updateConnectedFacebook) // connect page
                    .then(updatedPage => {
                    })
                    .catch(error => {
                      logger.serverLog(TAG,
                        `Failed to updatedPage ${JSON.stringify(error)}`, 'error')
                    })
                })
            }
            require('./../../../config/socketio').sendMessageToClient({
              room_id: req.body.companyId,
              body: {
                action: 'page_disconnect',
                payload: {
                  page_id: req.body.pageId,
                  user_id: req.user._id,
                  user_name: req.user.name,
                  company_id: req.body.companyId
                }
              }
            })

            utility.callApi(`pages/query`, 'post', { companyId: req.user.companyId, connected: true }) // fetch all pages of company
              .then(connectedPages => {
                let autopostingQuery = { companyId: req.user.companyId }
                if (connectedPages.length > 0) {
                  autopostingQuery.segmentationPageIds = [req.body.pageId]
                }
                AutopostingDataLayer.findAllAutopostingObjectsUsingQuery(autopostingQuery)
                  .then(autopostings => {
                    for (let i = 0; i < autopostings.length; i++) {
                      let autoposting = autopostings[i]
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
                        })
                    }
                  })
              })
            sendSuccessResponse(res, 200, 'Page disconnected successfully!')
          })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to update subscribers ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch page ${JSON.stringify(error)}`)
    })
}

exports.createWelcomeMessage = function (req, res) {
  utility.callApi(`pages/${req.body._id}`, 'put', { welcomeMessage: req.body.welcomeMessage })
    .then(updatedWelcomeMessage => {
      createMessageBlocks(req.body.linkedMessages ? req.body.linkedMessages : [], req.user, req.body._id, 'welcomeMessage')
        .then(results => {
          sendSuccessResponse(res, 200, 'Welcome Message updated successfully!')
        })
        .catch(err => {
          logger.serverLog(TAG, err)
          sendErrorResponse(res, 500, `Failed to create linked message blocks ${JSON.stringify(err)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to update welcome message ${JSON.stringify(error)}`)
    })
}

function createMessageBlocks (linkedMessages, user, moduleId, moduleType) {
  let messageBlockRequests = []
  let queryObject = { 'module.id': moduleId, 'module.type': 'welcomeMessage' }
  for (let i = 0; i < linkedMessages.length; i++) {
    let linkedMessage = linkedMessages[i]
    let data = {
      module: {
        id: moduleId,
        type: moduleType
      },
      title: linkedMessage.title,
      uniqueId: linkedMessage.id.toString(),
      payload: linkedMessage.messageContent,
      userId: user._id,
      companyId: user.companyId,
      datetime: new Date()
    }
    let query = {
      purpose: 'updateOne',
      match: queryObject,
      updated: data,
      upsert: true
    }
    messageBlockRequests.push(utility.callApi(`messageBlocks/`, 'put', query, 'kiboengage'))
  }
  return Promise.all(messageBlockRequests)
}

exports.enableDisableWelcomeMessage = function (req, res) {
  utility.callApi(`pages/${req.body._id}`, 'put', { isWelcomeMessageEnabled: req.body.isWelcomeMessageEnabled })
    .then(enabled => {
      sendSuccessResponse(res, 200, 'Operation completed successfully!')
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to update welcome message ${JSON.stringify(error)}`)
    })
}

exports.saveGreetingText = function (req, res) {
  const pageId = req.body.pageId
  const greetingText = req.body.greetingText

  utility.callApi(`pages/${pageId}/greetingText`, 'put', { greetingText: greetingText }, 'accounts', req.headers.authorization)
    .then(updatedGreetingText => {
      utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
        .then(companyuser => {
          utility.callApi(`pages/query`, 'post', { pageId: pageId, companyId: companyuser.companyId })
            .then(gotPage => {
              const pageToken = gotPage && gotPage[0].accessToken
              if (pageToken) {
                const requesturl = `https://graph.facebook.com/v6.0/me/messenger_profile?access_token=${pageToken}`
                var valueForMenu = {
                  'greeting': [
                    {
                      'locale': 'default',
                      'text': greetingText
                    }]
                }

                needle.request('post', requesturl, valueForMenu, { json: true },
                  function (err, resp) {
                    if (!err) {
                      if (resp.body.error) {
                        sendOpAlert(resp.body.error, 'pages controller in kiboengage', '', '', '')
                      }
                      sendSuccessResponse(res, 200, 'Operation completed successfully!')
                    }
                    if (err) {
                      logger.serverLog(TAG,
                        `Internal Server Error ${JSON.stringify(err)}`, 'error')
                    }
                  })
              } else {
                sendErrorResponse(res, 500, `Failed to find page access token to update greeting text message`)
              }
            })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch companyUser ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to update greeting text message ${JSON.stringify(error)}`)
    })
}

exports.addPages = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      utility.callApi(`pages/query`, 'post', { companyId: companyuser.companyId, isApproved: true }) // fetch all pages of company
        .then(pages => {
          let pagesToSend = logicLayer.removeDuplicates(pages)
          sendSuccessResponse(res, 200, pagesToSend)
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch pages ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.otherPages = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      utility.callApi(`pages/query`, 'post', { companyId: companyuser.companyId, connected: false, userId: req.user._id }) // fetch all pages of company
        .then(pages => {
          sendSuccessResponse(res, 200, pages)
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch pages ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.fetchWhitelistedDomains = function (req, res) {
  const pageId = req.params._id

  utility.callApi(`pages/whitelistDomain/${pageId}`, 'get', {}, 'accounts', req.headers.authorization)
    .then(whitelistDomains => {
      sendSuccessResponse(res, 200, whitelistDomains)
    })
    .catch(error => {
      sendErrorResponse(res, 500, '', `Failed to fetch whitelist domains ${JSON.stringify(error)}`)
    })
}
exports.deleteWhitelistDomain = function (req, res) {
  const pageId = req.body.page_id
  const whitelistDomain = req.body.whitelistDomain

  utility.callApi(`pages/deleteWhitelistDomain`, 'post', { page_id: pageId, whitelistDomain: whitelistDomain }, 'accounts', req.headers.authorization)
    .then(whitelistDomains => {
      sendSuccessResponse(res, 200, whitelistDomains)
    })
    .catch(error => {
      sendErrorResponse(res, 500, '', `Failed to delete whitelist domains ${JSON.stringify(error)}`)
    })
}

exports.whitelistDomain = function (req, res) {
  const pageId = req.body.page_id
  const whitelistDomains = req.body.whitelistDomains

  utility.callApi(`pages/whitelistDomain`, 'post', { page_id: pageId, whitelistDomains: whitelistDomains }, 'accounts', req.headers.authorization)
    .then(whitelistDomains => {
      sendSuccessResponse(res, 200, whitelistDomains)
    })
    .catch(error => {
      sendErrorResponse(res, 500, '', `Failed to save whitelist domains ${JSON.stringify(error)}`)
    })
}

exports.isWhitelisted = function (req, res) {
  broadcastUtility.isWhiteListedDomain(req.body.domain, req.body.pageId, req.user)
    .then(result => {
      sendSuccessResponse(res, 200, result.returnValue)
    })
}

exports.refreshPages = function (req, res) {
  utility.callApi(`pages/refreshPages`, 'post', {}, 'accounts', req.headers.authorization)// fetch all pages of company
    .then(response => {
      sendSuccessResponse(res, 200, response)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to refresh pages ${JSON.stringify(error)}`)
    })
}
