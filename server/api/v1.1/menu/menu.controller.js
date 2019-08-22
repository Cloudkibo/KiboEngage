/**
 * Created by sojharo on 23/10/2017.
 */
const logger = require('../../../components/logger')
const TAG = 'api/menu/menu.controller.js'
const needle = require('needle')
const callApi = require('../utility')
const broadcastUtility = require('../broadcasts/broadcasts.utility')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
let { sendOpAlert } = require('./../../global/operationalAlert')

// Get list of menu items
exports.index = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      callApi.callApi('menu/query', 'post', {companyId: companyUser.companyId})
        .then(menus => {
          sendSuccessResponse(res, 200, menus)
        })
        .catch(err => {
          logger.serverLog(TAG, `Internal Server Error on fetch ${err}`, 'error')
          sendErrorResponse(res, 500, '', 'Internal Server Error')
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
    })
}

exports.indexByPage = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      callApi.callApi('pages/query', 'post', {pageId: req.body.pageId, companyId: companyUser.companyId, connected: true})
        .then(page => {
          page = page[0]
          callApi.callApi('menu/query', 'post', {companyId: companyUser.companyId, pageId: page._id})
            .then(menus => {
              sendSuccessResponse(res, 200, menus)
            })
            .catch(err => {
              if (err) {
                logger.serverLog(TAG, `Internal Server Error on fetch ${err}`, 'error')
                sendErrorResponse(res, 500, '', 'Internal Server Error')
              }
            })
        })
        .catch(err => {
          if (err) {
            logger.serverLog(TAG, `Internal Server Error on fetch ${err}`, 'error')
            sendErrorResponse(res, 500, '', 'Internal Server Error')
          }
        })
    })
    .catch(err => {
      if (err) {
        sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
      }
    })
}

exports.create = function (req, res) {
  callApi.callApi('companyuser/query', 'post', {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        logger.serverLog(TAG, 'The user account does not belong to any company.', 'error')
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      callApi.callApi('pages/query', 'post', {pageId: req.body.pageId, companyId: companyUser.companyId, connected: true})
        .then(page => {
          page = page[0]
          if (!page) {
            logger.serverLog(TAG, 'Page not found', 'error')
            sendErrorResponse(res, 404, '', 'Page not found')
          }
          logger.serverLog(TAG, `page retrieved for menu creation: ${JSON.stringify(page)}`, 'debug')
          callApi.callApi('menu/query', 'post', {pageId: page._id, companyId: page.companyId})
            .then(info => {
              info = info[0]
              if (!info) {
                callApi.callApi('menu', 'post', {
                  pageId: page._id,
                  userId: req.body.userId,
                  companyId: companyUser.companyId,
                  jsonStructure: req.body.jsonStructure
                })
                  .then(savedMenu => {
                    require('./../../../config/socketio').sendMessageToClient({
                      room_id: companyUser.companyId,
                      body: {
                        action: 'menu_updated',
                        payload: {
                          page_id: page._id,
                          user_id: req.user._id,
                          user_name: req.user.name,
                          payload: savedMenu
                        }
                      }
                    })
                    const requestUrl = `https://graph.facebook.com/v2.6/me/messenger_profile?access_token=${page.accessToken}`
                    logger.serverLog(TAG, `requestUrl for menu creation ${requestUrl}`, 'debug')
                    needle.request('post', requestUrl, req.body.payload, {json: true},
                      (err, resp) => {
                        if (err) {
                          logger.serverLog(TAG,
                            `Internal Server Error ${JSON.stringify(err)}`, 'error')
                        }
                        if (!err) {
                        }
                        if (resp.body.error) {
                          sendOpAlert(resp.body.error, 'menu controller in kiboengage')
                          sendErrorResponse(res, 500, '', JSON.stringify(resp.body.error))
                        } else {
                          res.status(201).json({status: 'success', payload: savedMenu})
                        }
                      })
                  })
                  .catch(err => {
                    sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
                  })
              } else {
                callApi.callApi('menu/update', 'put', {
                  query: {pageId: page._id},
                  newPayload: {jsonStructure: req.body.jsonStructure},
                  options: {}
                })
                  .then(updated => {
                    const requestUrl = `https://graph.facebook.com/v2.6/me/messenger_profile?access_token=${page.accessToken}`
                    logger.serverLog(TAG, `requestUrl for menu creation ${requestUrl}`, 'debug')
                    require('./../../../config/socketio').sendMessageToClient({
                      room_id: companyUser.companyId,
                      body: {
                        action: 'menu_updated',
                        payload: {
                          page_id: page._id,
                          user_id: req.user._id,
                          user_name: req.user.name,
                          payload: updated
                        }
                      }
                    })
                    logger.serverLog(TAG, `req.body.payload passed to graph api ${JSON.stringify(req.body.payload)}`, 'debug')
                    needle.request('post', requestUrl, req.body.payload, {json: true},
                      (err, resp) => {
                        if (!err) {
                        }
                        if (err) {
                          logger.serverLog(TAG,
                            `Internal Server Error ${JSON.stringify(err)}`, 'error')
                        }
                        if (resp.body.error) {
                          sendOpAlert(resp.body.error, 'menu controller in kiboengage')
                          logger.serverLog(TAG, `Error from facebook graph api: ${JSON.stringify(resp.body.error)}`, 'error')
                          sendErrorResponse(res, 500, '', JSON.stringify(resp.body.error))
                        } else {
                          callApi.callApi('menu/query', 'post', {pageId: page._id, companyId: page.companyId})
                            .then(info1 => {
                              info1 = info1[0]
                              sendSuccessResponse(res, 200, info1)
                            })
                            .catch(err => {
                              if (err) {
                                logger.serverLog(TAG, `Error occurred in finding menu${JSON.stringify(err)}`, 'error')
                              }
                            })
                        }
                      })
                  })
                  .catch(err => {
                    if (err) {
                      logger.serverLog(TAG,
                        `Error occurred in finding subscriber${JSON.stringify(
                          err)}`, 'error')
                    }
                  })
              }
            })
            .catch(err => {
              if (err) {
                logger.serverLog(TAG,
                  `Internal Server Error ${JSON.stringify(err)}`, 'error')
                sendErrorResponse(res, 500, '', 'Failed to find menu. Internal Server Error')
              }
            })
        })
        .catch(err => {
          if (err) {
            logger.serverLog(TAG,
              `Internal Server Error ${JSON.stringify(err)}`, 'error')
            sendErrorResponse(res, 500, '', 'Failed to find page. Internal Server Error')
          }
        })
    })
    .catch(err => {
      if (err) {
        sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
      }
    })
}
exports.addWebview = function (req, res) {
  broadcastUtility.isWhiteListedDomain(req.body.url, req.body.pageId, req.user)
    .then(result => {
      if (result.returnValue) {
        let payload = {
          type: req.body.type,
          url: req.body.url,
          title: req.body.title
        }
        sendSuccessResponse(res, 200, payload)
      } else {
        sendErrorResponse(res, 500, `The given domain is not whitelisted. Please add it to whitelisted domains.`)
      }
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to find whitelisted_domains ${JSON.stringify(error)}`)
    })
}
