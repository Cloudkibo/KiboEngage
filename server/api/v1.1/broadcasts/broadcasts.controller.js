const BroadcastLogicLayer = require('./broadcasts.logiclayer')
const BroadcastDataLayer = require('./broadcasts.datalayer')
const BroadcastPageDataLayer = require('../page_broadcast/page_broadcast.datalayer')
const URLDataLayer = require('../URLForClickedCount/URL.datalayer')
const PageAdminSubscriptionDataLayer = require('../pageadminsubscriptions/pageadminsubscriptions.datalayer')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/broadcast/broadcasts.controller.js'
const needle = require('needle')
const path = require('path')
const fs = require('fs')
let config = require('./../../../config/environment')
let _ = require('lodash')
let request = require('request')
const crypto = require('crypto')
const broadcastUtility = require('./broadcasts.utility')
const utility = require('../utility')
const validateInput = require('../../global/validateInput')
const { facebookApiCaller } = require('../../global/facebookApiCaller')
const async = require('async')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const { sendUsingBatchAPI } = require('../../global/sendConversation')
const { isApprovedForSMP } = require('../../global/subscriptionMessaging')
const { prepareSubscribersCriteria, createMessageBlocks } = require('../../global/utility')
const PollResponseDataLayer = require('../polls/pollresponse.datalayer')
const surveyResponseDataLayer = require('../surveys/surveyresponse.datalayer')
const ogs = require('open-graph-scraper')
const { updateCompanyUsage } = require('../../global/billingPricing')

exports.index = function (req, res) {
  let criteria = BroadcastLogicLayer.getCriterias(req)
  let aggregateData = {
    match: criteria.finalCriteria[0].$match,
    sort: criteria.finalCriteria[1].$sort,
    skip: criteria.finalCriteria[2].$skip,
    limit: criteria.finalCriteria[3].$limit
  }
  async.parallelLimit([
    _getBroadcastsCount.bind(null, criteria),
    _getBroadcastsData.bind(null, aggregateData),
    _getBroadcastPagesData.bind(null, req)
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Failed to fetch broadcasts'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch broadcasts. See server logs for more info`)
    } else {
      const broadcasts = results[1]
      const broadcastsCount = results[0]
      const broadcastpages = results[2]
      const payload = {
        broadcasts,
        count: broadcastsCount.length > 0 ? broadcastsCount[0].count : 0,
        broadcastpages
      }
      sendSuccessResponse(res, 200, payload)
    }
  })
}

const _getBroadcastsCount = (criteria, next) => {
  BroadcastDataLayer.countBroadcasts(criteria.countCriteria[0].$match)
    .then(broadcastsCount => {
      next(null, broadcastsCount)
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _getBroadcastsCount`, {criteria}, {}, 'error')
      next(err)
    })
}

exports.sendUserInputComponent = function (req, res) {
  console.log('sendUserInputComponent called')
}
const _getBroadcastsData = (aggregateData, next) => {
  BroadcastDataLayer.aggregateForBroadcasts(aggregateData.match,
    undefined,
    undefined,
    aggregateData.limit,
    aggregateData.sort,
    aggregateData.skip
  )
    .then(broadcasts => {
      next(null, broadcasts)
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _getBroadcastsData`, {aggregateData}, {}, 'error')
      next(err)
    })
}

const _getBroadcastPagesData = (req, next) => {
  BroadcastPageDataLayer.genericFind({ companyId: req.user.companyId })
    .then(broadcastpages => {
      next(null, broadcastpages)
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: _getBroadcastPagesData`, req.body, {user: req.user}, 'error')
      next(err)
    })
}

exports.delete = function (req, res) {
  let dir = path.resolve(__dirname, '../../../broadcastFiles/userfiles')
  // unlink file
  fs.unlink(dir + '/' + req.params.id, function (err) {
    if (err) {
      sendErrorResponse(res, 404, '', 'File not found')
    } else {
      sendSuccessResponse(res, 200, 'File deleted successfully')
    }
  })
}
exports.addButton = function (req, res) {
  BroadcastLogicLayer.isValidButtonPayload(req.body)
    .then(result => {
      if (!result) {
        return sendErrorResponse(res, 500, '', 'Invalid Payload')
      }
      let buttonPayload = {
        title: req.body.title,
        type: req.body.type
      }
      if (req.body.type === 'web_url') {
        if (req.body.messenger_extensions || req.body.webview_height_ratio) {
          if (!broadcastUtility.isWebView(req.body)) {
            return sendErrorResponse(res, 400, `parameters are missing`)
          }
          broadcastUtility.isWhiteListedDomain(req.body.url, req.body.pageId, req.user)
            .then(result => {
              if (result.returnValue) {
                var webViewPayload = {
                  type: req.body.type,
                  url: req.body.url, // User defined link,
                  title: req.body.title, // User defined label
                  messenger_extensions: req.body.messenger_extensions,
                  webview_height_ratio: req.body.webview_height_ratio
                }
                sendSuccessResponse(res, 200, webViewPayload)
              } else {
                sendErrorResponse(res, 500, `The given domain is not whitelisted. Please add it to whitelisted domains.`)
              }
            })
        } else {
          URLDataLayer.createURLObject({
            originalURL: req.body.url,
            module: {
              type: req.body.module.type
            }
          })
            .then(savedurl => {
              let newURL = config.domain + `/api/URL/${req.body.module.type}/` + savedurl._id
              buttonPayload.newUrl = newURL
              buttonPayload.url = req.body.url
              sendSuccessResponse(res, 200, buttonPayload)
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.addButton`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to save url ${JSON.stringify(error)}`)
            })
        }
      } else {
        buttonPayload.payload = JSON.stringify(req.body.payload)
        sendSuccessResponse(res, 200, buttonPayload)
      }
    })
}
exports.editButton = function (req, res) {
  BroadcastLogicLayer.isValidButtonPayload(req.body)
    .then(result => {
      if (!result) {
        return sendErrorResponse(res, 500, '', 'Invalid Payload')
      }
      let buttonPayload = {
        title: req.body.title,
        type: req.body.type
      }
      if (req.body.type === 'web_url' && !req.body.messenger_extensions) {
        // TODO save module id when sending broadcast
        if (req.body.oldUrl && req.body.oldUrl !== '') {
          let temp = req.body.oldUrl.split('/')
          let id = temp[temp.length - 1]
          URLDataLayer.updateOneURL(id, {originalURL: req.body.newUrl})
            .then(savedurl => {
              let newURL = config.domain + '/api/URL/broadcast/' + savedurl._id
              buttonPayload.newUrl = newURL
              buttonPayload.url = req.body.newUrl
              sendSuccessResponse(res, 200, { id: req.body.id, button: buttonPayload })
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.editButton`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to save url ${JSON.stringify(error)}`)
            })
        } else {
          URLDataLayer.createURLObject({
            originalURL: req.body.newUrl,
            module: {
              type: 'broadcast'
            }
          })
            .then(savedurl => {
              let newURL = config.domain + '/api/URL/broadcast/' + savedurl._id
              buttonPayload.newUrl = newURL
              buttonPayload.url = req.body.newUrl
              sendSuccessResponse(res, 200, { id: req.body.id, button: buttonPayload })
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.editButton`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to save url ${JSON.stringify(error)}`)
            })
        }
      } else if (req.body.type === 'web_url' && (req.body.messenger_extensions || req.body.webview_height_ratio)) {
        if (!broadcastUtility.isWebView(req.body)) {
          sendErrorResponse(res, 400, `parameters are missing`)
        }
        broadcastUtility.isWhiteListedDomain(req.body.url, req.body.pageId, req.user)
          .then(result => {
            if (result.returnValue) {
              var webViewPayload = {
                type: req.body.type,
                url: req.body.url, // User defined link,
                title: req.body.title, // User defined label
                messenger_extensions: req.body.messenger_extensions,
                webview_height_ratio: req.body.webview_height_ratio
              }
              sendSuccessResponse(res, 200, {id: req.body.id, button: webViewPayload})
            } else {
              sendErrorResponse(res, 400, `The given domain is not whitelisted. Please add it to whitelisted domains.`)
            }
          })
      } else {
        buttonPayload.payload = JSON.stringify(req.body.payload)
        sendSuccessResponse(res, 200, buttonPayload)
      }
    })
}
exports.deleteButton = function (req, res) {
  URLDataLayer.deleteOneURL(req.params.id)
    .then(deleted => {
      sendSuccessResponse(res, 200, '', 'Url deleted successfully!')
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.deleteButton`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to delete url ${JSON.stringify(error)}`)
    })
}

exports.download = function (req, res) {
  let dir = path.resolve(__dirname, '../../../../broadcastFiles/userfiles')
  try {
    res.sendfile(req.params.id, {root: dir})
  } catch (err) {
    const message = err || 'Download file error'
    logger.serverLog(message, `${TAG}: exports.download`, {id: req.params.id}, {}, 'error')
    sendErrorResponse(res, 404, 'Not Found ' + JSON.stringify(err))
  }
}

exports.upload = function (req, res) {
  let today = new Date()
  let uid = crypto.randomBytes(5).toString('hex')
  let serverPath = 'f' + uid + '' + today.getFullYear() + '' + (today.getMonth() + 1) + '' + today.getDate()
  serverPath += '' + today.getHours() + '' + today.getMinutes() + '' + today.getSeconds()
  let fext = req.files.file.name.split('.')
  serverPath += '.' + fext[fext.length - 1].toLowerCase()
  let dir = path.resolve(__dirname, '../../../../broadcastFiles/')

  if (req.files.file.size === 0) {
    sendErrorResponse(res, 400, '', 'No file submitted')
  }

  let filedata = {
    filePath: req.files.file.path,
    serverPath: dir + '/userfiles/' + serverPath,
    serverPathWithFileName: dir + '/userfiles/' + req.files.file.name,
    pages: req.body.pages,
    componentType: req.body.componentType
  }
  async.series([
    _renameFile(null, filedata),
    _writeFileStream(null, filedata),
    _fetchPage(null, filedata),
    _refreshPageAccessToken(null, filedata),
    _uploadOnFacebook(null, filedata)
  ], function (err) {
    if (err) {
      const message = err || 'Failed to upload file'
      logger.serverLog(message, `${TAG}: exports.upload`, {files: req.files}, {}, 'error')
      sendErrorResponse(res, 500, '', 'An unexpected error occured while uploading the file. See server logs for more info.')
    } else {
      let payload = {
        id: serverPath,
        attachment_id: filedata.attachment_id,
        url: `${config.domain}/api/broadcasts/download/${serverPath}`,
        name: req.files.file.name
      }
      sendSuccessResponse(res, 200, payload)
    }
  })
}

const _renameFile = (filedata, next) => {
  fs.rename(filedata.filePath, filedata.serverPath, err => {
    if (err) {
      next(err)
    } else {
      next(null)
    }
  })
}

const _writeFileStream = (filedata, next) => {
  try {
    let readData = fs.createReadStream(filedata.serverPath)
    let writeData = fs.createWriteStream(filedata.serverPathWithFileName)
    readData.pipe(writeData)
    next(null)
  } catch (err) {
    const message = err || 'Internal Server Error'
    logger.serverLog(message, `${TAG}: _writeFileStream`, {filedata}, {}, 'error')
    next(err)
  }
}

const _fetchPage = (filedata, next) => {
  if (filedata.pages && filedata.pages !== 'undefined' && filedata.pages.length > 0) {
    let pages = JSON.parse(filedata.pages)
    utility.callApi(`pages/${pages[0]}`, 'get', {})
      .then(page => {
        filedata.page = page
        next(null, filedata)
      })
      .catch(err => {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: _fetchPage`, {filedata}, {}, 'error')
        next(err)
      })
  } else {
    next(null)
  }
}

const _refreshPageAccessToken = (filedata, next) => {
  if (filedata.pages && filedata.pages !== 'undefined' && filedata.pages.length > 0) {
    needle('get', `https://graph.facebook.com/v6.0/${filedata.page.pageId}?fields=access_token&access_token=${filedata.page.userId.facebookInfo.fbToken}`)
      .then(response => {
        if (response.body.error) {
          next(response.body.error)
        } else {
          filedata.pageAccessToken = response.body.access_token
          next(null, filedata)
        }
      })
      .catch(err => {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: _refreshPageAccessToken`, {filedata}, {}, 'error')
        next(err)
      })
  } else {
    next(null)
  }
}

const _uploadOnFacebook = (filedata, next) => {
  if (filedata.pages && filedata.pages !== 'undefined' && filedata.pages.length > 0) {
    let fileReaderStream = fs.createReadStream(filedata.serverPathWithFileName)
    const messageData = {
      'message': JSON.stringify({
        'attachment': {
          'type': filedata.componentType,
          'payload': {
            'is_reusable': true
          }
        }
      }),
      'filedata': fileReaderStream
    }
    request(
      {
        'method': 'POST',
        'json': true,
        'formData': messageData,
        'uri': 'https://graph.facebook.com/v6.0/me/message_attachments?access_token=' + filedata.pageAccessToken
      },
      function (err, resp) {
        if (err) {
          next(err)
        } else if (resp.body.error) {
          const message = resp.body.error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: _uploadOnFacebook`, {filedata}, {}, 'error')
          next(resp.body.error)
        } else {
          filedata.attachment_id = resp.body.attachment_id
          next(null, filedata)
        }
      })
  } else {
    next(null)
  }
}

exports.uploadForTemplate = function (req, res) {
  let dir = path.resolve(__dirname, '../../../../broadcastFiles/')
  let filedata = {
    pages: req.body.pages,
    serverPathWithFileName: dir + '/userfiles/' + req.body.name
  }
  async.series([
    _fetchPage(null, filedata),
    _refreshPageAccessToken(null, filedata),
    _uploadOnFacebook(null, filedata)
  ], function (err) {
    if (err) {
      const message = err || 'Failed to upload file'
      logger.serverLog(message, `${TAG}: exports.uploadForTemplate`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', 'An expexted error occured while uploading the file. See server logs for more info.')
    } else {
      let payload = {
        id: req.body.id,
        attachment_id: filedata.attachment_id,
        name: req.body.name,
        url: req.body.url
      }
      sendSuccessResponse(res, 200, payload)
    }
  })
}

exports.sendConversation = function (req, res) {
  if (req.body.segmentationPageIds.length !== 1) { // restrict to one page
    sendErrorResponse(res, 400, '', 'Please select only one page')
  } else if (!validateInput.facebookBroadcast(req.body)) { // validate broadcast
    sendErrorResponse(res, 400, '', 'Please fill all the required fields')
  } else {
    utility.callApi(`pages/query`, 'post', {companyId: req.user.companyId, connected: true, _id: req.body.segmentationPageIds[0]})
      .then(pages => {
        if (pages.length > 0) {
          const page = pages[0]
          const payload = req.body.payload
          if (req.body.self) {
            sendTestBroadcast(req.user, page, payload, req, res)
          } else {
            sendBroadcastToSubscribers(page, payload, req, res)
          }
        } else {
          sendErrorResponse(res, 500, `Page not found`)
        }
      })
      .catch(err => {
        const message = err || 'Failed to fetch page'
        logger.serverLog(message, `${TAG}: exports.sendConversation`, req.body, {user: req.user}, 'error')
      })
  }
}

const sendBroadcastToSubscribers = (page, payload, req, res) => {
  BroadcastDataLayer.createForBroadcast(broadcastUtility.prepareBroadCastPayload(req, req.user.companyId))
    .then(broadcast => {
      createMessageBlocks(req.body.linkedMessages, req.user, broadcast._id, 'broadcast')
        .then(results => {
          require('./../../../config/socketio').sendMessageToClient({
            room_id: req.user.companyId,
            body: {
              action: 'new_broadcast',
              payload: {
                broadcast_id: broadcast._id,
                user_id: req.user._id,
                user_name: req.user.name
              }
            }
          })
          broadcastUtility.addModuleIdIfNecessary(payload, broadcast._id) // add module id in buttons for click count
          let pageBroadcastData = {
            pageId: page.pageId,
            userId: req.user._id,
            broadcastId: broadcast._id,
            seen: false,
            sent: false,
            companyId: req.user.companyId
          }
          let reportObj = {
            successful: 0,
            unsuccessful: 0,
            errors: []
          }
          if (req.body.isList) {
            utility.callApi(`lists/query`, 'post', BroadcastLogicLayer.ListFindCriteria(req.body, req.user))
              .then(lists => {
                let subsFindCriteria = prepareSubscribersCriteria(req.body, page, lists, payload.length, req.body.isApprovedForSMP)
                sendUsingBatchAPI('broadcast', payload, {criteria: subsFindCriteria}, page, req.user, reportObj, _savePageBroadcast, pageBroadcastData)
                sendSuccessResponse(res, 200, '', 'Conversation sent successfully!')
              })
              .catch(error => {
                const message = error || 'Failed to fetch lists'
                logger.serverLog(message, `${TAG}: sendBroadcastToSubscribers`, req.body, {user: req.user}, 'error')
                sendErrorResponse(res, 500, `Failed to fetch lists see server logs for more info`)
              })
          } else {
            let subsFindCriteria = prepareSubscribersCriteria(req.body, page, undefined, payload.length, req.body.isApprovedForSMP)
            console.log('subsFindCriteria', subsFindCriteria)
            if (req.body.isSegmented && req.body.segmentationTags.length > 0) {
              utility.callApi(`tags/query`, 'post', { companyId: req.user.companyId, tag: { $in: req.body.segmentationTags } })
                .then(tags => {
                  let tagIds = tags.map((t) => t._id)
                  utility.callApi(`tags_subscriber/query`, 'post', { tagId: { $in: tagIds } })
                    .then(tagSubscribers => {
                      if (tagSubscribers.length > 0) {
                        let subscriberIds = tagSubscribers.map((ts) => ts.subscriberId._id)
                        subsFindCriteria['_id'] = {$in: subscriberIds}
                        sendUsingBatchAPI('broadcast', payload, {criteria: subsFindCriteria}, page, req.user, reportObj, _savePageBroadcast, pageBroadcastData)
                        sendSuccessResponse(res, 200, '', 'Conversation sent successfully!')
                      } else {
                        sendErrorResponse(res, 500, 'No subscribers match the given criteria')
                      }
                    })
                    .catch(err => {
                      const message = err || 'Failed to fetch tag subscribers'
                      logger.serverLog(message, `${TAG}: sendBroadcastToSubscribers`, req.body, {user: req.user}, 'error')
                      sendErrorResponse(res, 500, 'Failed to fetch tag subscribers')
                    })
                })
                .catch(err => {
                  const message = err || 'Failed to fetch tags'
                  logger.serverLog(message, `${TAG}: sendBroadcastToSubscribers`, req.body, {user: req.user}, 'error')
                  sendErrorResponse(res, 500, 'Failed to fetch tags')
                })
            } else {
              sendUsingBatchAPI('broadcast', payload, {criteria: subsFindCriteria}, page, req.user, reportObj, _savePageBroadcast, pageBroadcastData)
              sendSuccessResponse(res, 200, '', 'Conversation sent successfully!')
            }
          }
        })
        .catch(err => {
          const message = err || 'Failed to create linked message blocks'
          logger.serverLog(message, `${TAG}: sendBroadcastToSubscribers`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to create linked message blocks ${err}`)
        })
    })
    .catch(err => {
      const message = err || 'Failed to create broadcast'
      logger.serverLog(message, `${TAG}: sendBroadcastToSubscribers`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 'Failed to create broadcast see server logs for more info')
    })
}

const _savePageBroadcast = (data) => {
  BroadcastPageDataLayer.createForBroadcastPage(data)
    .then(savedpagebroadcast => {
      require('../../global/messageStatistics').record('broadcast')
    })
    .catch(error => {
      const message = error || 'Failed to create page_broadcast'
      logger.serverLog(message, `${TAG}: _savePageBroadcast`, data, {}, 'error')
    })
}

const sendBroadcast = (batchMessages, page, res, subscriberNumber, subscribersLength, testBroadcast) => {
  const r = request.post('https://graph.facebook.com', (err, httpResponse, body) => {
    body = JSON.parse(body)
    if (err) {
      const message = err || 'Batch send error'
      logger.serverLog(message, `${TAG}: sendBroadcast`, body, {}, 'error')
      sendErrorResponse(res, 500, `Failed to send broadcast ${JSON.stringify(err)}`)
    }

    // Following change is to incorporate persistant menu

    if (res === 'menu') {
      // we don't need to send res for persistant menu
    } else {
      if (testBroadcast || (subscriberNumber === (subscribersLength - 1))) {
        sendSuccessResponse(res, 200, '', 'Conversation sent successfully!')
      }
    }
  })
  const form = r.form()
  form.append('access_token', page.accessToken)
  form.append('batch', batchMessages)
}

const sendTestBroadcast = (companyUser, page, payload, req, res) => {
  var testBroadcast = true
  PageAdminSubscriptionDataLayer.genericFind({companyId: companyUser.companyId, pageId: page._id, userId: req.user._id})
    .then(subscriptionUser => {
      subscriptionUser = subscriptionUser[0]
      let match = {
        companyId: companyUser.companyId,
        pageId: page._id,
        senderId: subscriptionUser.subscriberId,
        lastMessagedAt: {
          $gt: new Date((new Date().getTime() - (24 * 60 * 60 * 1000)))
        }
      }
      utility.callApi(`subscribers/query`, 'post', match)
        .then(subscribers => {
          if (subscribers.length > 0) {
            broadcastUtility.getSubscriberInfoFromFB(subscriptionUser.subscriberId, page)
              .then(response => {
                const subscriber = response.body
                let fname = subscriber.first_name
                let lname = subscriber.last_name
                broadcastUtility.getBatchData(payload, subscriptionUser.subscriberId, page, sendBroadcast, fname, lname, res, null, null, req.body.fbMessageTag, testBroadcast)
              })
              .catch(error => {
                const message = error || 'Failed to fetch data from facebook'
                logger.serverLog(message, `${TAG}: sendTestBroadcast`, req.body, {user: req.user}, 'error')
                sendErrorResponse(res, 500, `Failed to fetch user ${JSON.stringify(error)}`)
              })
          } else {
            sendErrorResponse(res, 500, `User hasn't messaged page in 24 hours`, `You need to message the page before you can send a test broadcast`)
          }
        })
        .catch(error => {
          const message = error || 'Failed to fetch subscriber'
          logger.serverLog(message, `${TAG}: sendTestBroadcast`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch subscriber ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch adminsubscription'
      logger.serverLog(message, `${TAG}: sendTestBroadcast`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch adminsubscription ${JSON.stringify(error)}`)
    })
}

exports.addCardAction = function (req, res) {
  if (req.body.type === 'web_url' && !(_.has(req.body, 'url'))) {
    sendErrorResponse(res, 400, '', 'Url is required for type web_url.')
  }
  let buttonPayload = {
    type: req.body.type
  }
  if (req.body.messenger_extensions || req.body.webview_height_ratio) {
    if (!broadcastUtility.isWebView(req.body)) {
      return res.status(500).json({status: 'failed', payload: `parameters are missing`})
    }
    broadcastUtility.isWhiteListedDomain(req.body.url, req.body.pageId, req.user)
      .then(result => {
        if (result.returnValue) {
          var webViewPayload = {
            type: req.body.type,
            url: req.body.url, // User defined link,
            messenger_extensions: req.body.messenger_extensions,
            webview_height_ratio: req.body.webview_height_ratio
          }
          sendSuccessResponse(res, 200, webViewPayload)
        } else {
          sendErrorResponse(res, 500, `The given domain is not whitelisted. Please add it to whitelisted domains.`)
        }
      })
      .catch(err => {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: addCardAction`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 500, `Error at checking whitelist domain ${err}`)
      })
  } else {
    URLDataLayer.createURLObject({
      originalURL: req.body.url,
      module: {
        type: 'broadcast'
      }
    })
      .then(savedurl => {
        let newURL = config.domain + '/api/URL/broadcast/' + savedurl._id
        buttonPayload.newUrl = newURL
        buttonPayload.url = req.body.url
        sendSuccessResponse(res, 200, buttonPayload)
      })
      .catch(error => {
        const message = error || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: addCardAction`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 500, `Failed to save url ${JSON.stringify(error)}`)
      })
  }
}

exports.retrieveReachEstimation = (req, res) => {
  utility.callApi('pages/query', 'post', {_id: req.params.page_id})
    .then(pages => {
      let page = pages[0]
      facebookApiCaller('v2.11', `${page.reachEstimationId}?access_token=${page.pageAccessToken}`, 'get', {})
        .then(reachEstimation => {
          if (reachEstimation.error) {
            sendErrorResponse(res, 500, `Failed to retrieve reach estimation ${JSON.stringify(reachEstimation.error)}`)
          } else {
            sendSuccessResponse(res, 200, reachEstimation)
          }
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: addCardAction`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to retrieve reach estimation ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: addCardAction`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch page ${JSON.stringify(error)}`)
    })
}

exports.urlMetaData = (req, res) => {
  let url = req.body.url
  if (url.includes('kiboengage.cloudkibo.com') || url.includes('kibochat.cloudkibo.com')) {
    url = 'https://kibopush.com'
  }
  if (url) {
    let options = {url}
    ogs(options, (error, results) => {
      console.log('url metadata results', results)
      if (!error) {
        return res.status(200).json({
          status: 'success',
          payload: results
        })
      } else {
        return res.status(500).json({
          status: 'failed',
          description: `Failed to retrieve url ${results.error}`
        })
      }
    })
  } else {
    res.status(400).json({
      status: 'failed',
      description: 'url not given in paramater'
    })
  }
}

exports.retrieveSubscribersCount = function (req, res) {
  let segmentationPoll = []
  let segmentationSurvey = []
  if (req.body.segmentationPoll) {
    segmentationPoll = req.body.segmentationPoll
  }
  if (req.body.segmentationSurvey) {
    segmentationSurvey = req.body.segmentationSurvey
  }
  let match = {
    pageId: req.body.pageId,
    companyId: req.user.companyId,
    completeInfo: true,
    isSubscribed: true,
    disabledByPlan: false,
    lastMessagedAt: {
      $gt: new Date((new Date().getTime() - (24 * 60 * 60 * 1000)))
    }
  }
  if (req.body.isList) {
    utility.callApi(`lists/query`, 'post', BroadcastLogicLayer.ListFindCriteria(req.body, req.user))
      .then(lists => {
        lists = [].concat(lists)
        lists = lists.map((l) => l.content)
        lists = [].concat.apply([], lists)
        lists = lists.filter((item, i, arr) => arr.indexOf(item) === i)
        match['_id'] = {$in: lists}
        _getSubscribersCount(req.body, match, res)
      })
      .catch(err => {
        const message = err || 'Failed to fetch list'
        logger.serverLog(message, `${TAG}: exports.retrieveSubscribersCount`, req.body, {user: req.user}, 'error')
      })
  } else if (req.body.segmented) {
    if (req.body.segmentationGender.length > 0) match.gender = {$in: req.body.segmentationGender}
    if (req.body.segmentationLocale.length > 0) match.locale = {$in: req.body.segmentationLocale}
    if (req.body.segmentationTags.length > 0 || segmentationPoll.length > 0 || segmentationSurvey.length > 0) {
      utility.callApi(`tags/query`, 'post', { companyId: req.user.companyId, tag: { $in: req.body.segmentationTags } })
        .then(tags => {
          let tagIds = tags.map((t) => t._id)
          let requests = []
          requests.push(utility.callApi(`tags_subscriber/query`, 'post', { companyId: req.user.companyId, tagId: { $in: tagIds } }))
          requests.push(PollResponseDataLayer.genericFindForPollResponse({pollId: {$in: segmentationPoll}}))
          requests.push(surveyResponseDataLayer.genericFind({surveyId: {$in: segmentationSurvey}}))
          Promise.all(requests)
            .then(results => {
              console.log('segmentation results', results)
              let tagSubscribers = []
              let pollSubscribers = []
              let surveySubscribers = []
              if (req.body.segmentationTags.length > 0) {
                if (results[0].length > 0) {
                  tagSubscribers = results[0].map((ts) => ts.subscriberId._id)
                }
              }
              if (segmentationPoll.length > 0) {
                if (results[1].length > 0) {
                  pollSubscribers = results[1].map((pr) => pr.subscriberId)
                }
              }
              if (segmentationSurvey.length > 0) {
                if (results[2].length > 0) {
                  surveySubscribers = results[2].map((pr) => pr.subscriberId)
                }
              }
              if (req.body.segmentationTags.length > 0 && segmentationPoll.length > 0) {
                let subscriberIds = _.intersection(tagSubscribers, pollSubscribers)
                match['_id'] = {$in: subscriberIds}
                _getSubscribersCount(req.body, match, res)
              } else if (req.body.segmentationTags.length > 0 && segmentationSurvey.length > 0) {
                let subscriberIds = _.intersection(tagSubscribers, surveySubscribers)
                match['_id'] = {$in: subscriberIds}
                _getSubscribersCount(req.body, match, res)
              } else if (segmentationSurvey.length > 0) {
                match['_id'] = {$in: surveySubscribers}
                _getSubscribersCount(req.body.pageAccessToken, match, res)
              } else if (segmentationPoll.length > 0) {
                match['_id'] = {$in: pollSubscribers}
                _getSubscribersCount(req.body, match, res)
              } else if (req.body.segmentationTags.length > 0) {
                match['_id'] = {$in: tagSubscribers}
                _getSubscribersCount(req.body, match, res)
              } else {
                match['_id'] = []
                _getSubscribersCount(req.body, match, res)
              }
            })
        })
        .catch(err => {
          const message = err || 'Failed to fetch tags'
          logger.serverLog(message, `${TAG}: exports.retrieveSubscribersCount`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, 'Failed to fetch tags')
        })
    } else {
      _getSubscribersCount(req.body, match, res)
    }
  } else {
    _getSubscribersCount(req.body, match, res)
  }
}

const _getSubscribersCount = (body, match, res) => {
  utility.callApi(`pages/${body.pageId}`)
    .then(page => {
      isApprovedForSMP(page)
        .then(smpStatus => {
          let smp = false
          if (smpStatus === 'approved' || smpStatus === true) {
            smp = true
          }
          async.parallelLimit([
            function (cb) {
              let matchCriteria = Object.assign({}, match)
              delete matchCriteria.lastMessagedAt
              let criteria = [
                {$match: matchCriteria},
                {$group: {_id: null, count: {$sum: 1}}}
              ]
              utility.callApi(`subscribers/aggregate`, 'post', criteria)
                .then(response => {
                  let count = 0
                  if (response.length > 0) {
                    count = response[0].count
                  }
                  cb(null, count)
                })
                .catch(err => {
                  const message = err || 'Internal Server Error'
                  logger.serverLog(message, `${TAG}: _getSubscribersCount`, {body, match}, {}, 'error')
                  cb(err)
                })
            },
            function (cb) {
              let matchCriteria = Object.assign({}, match)
              if (smp) delete matchCriteria.lastMessagedAt
              let criteria = [
                {$match: matchCriteria},
                {$group: {_id: null, count: {$sum: 1}}}
              ]
              utility.callApi(`subscribers/aggregate`, 'post', criteria)
                .then(response => {
                  let count = 0
                  if (response.length > 0) {
                    count = response[0].count
                  }
                  cb(null, count)
                })
                .catch(err => {
                  const message = err || 'Internal Server Error'
                  logger.serverLog(message, `${TAG}: _getSubscribersCount`, {body, match}, {}, 'error')
                  cb(err)
                })
            }
          ], 10, function (err, results) {
            if (err) {
              const message = err || 'Failed to get subscribers count'
              logger.serverLog(message, `${TAG}: _getSubscribersCount`, body, {}, 'error')
              sendErrorResponse(res, 500, 'Failed to get subscribers count')
            } else {
              let payload = {
                isApprovedForSMP: smp,
                totalCount: results[0],
                count: results[1]
              }
              sendSuccessResponse(res, 200, payload)
            }
          })
        })
        .catch(err => {
          const message = err || 'Failed to get subscribers count'
          logger.serverLog(message, `${TAG}: _getSubscribersCount`, body, {}, 'error')
          sendErrorResponse(res, 500, 'Failed to get subscribers count')
        })
    })
    .catch(err => {
      const message = err || 'Failed to fetch page'
      logger.serverLog(message, `${TAG}: _getSubscribersCount`, body, {}, 'error')
      sendErrorResponse(res, 500, 'Failed to fetch page')
    })
}

exports.sendBroadcast = sendBroadcast
