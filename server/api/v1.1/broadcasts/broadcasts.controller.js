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
const uniqid = require('uniqid')
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
      logger.serverLog(TAG, `Failed to fetch broadcasts ${JSON.stringify(err)}`, 'error')
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
      next(err)
    })
}

const _getBroadcastPagesData = (req, next) => {
  BroadcastPageDataLayer.genericFind({ companyId: req.user.companyId })
    .then(broadcastpages => {
      next(null, broadcastpages)
    })
    .catch(err => {
      next(err)
    })
}

exports.delete = function (req, res) {
  let dir = path.resolve(__dirname, '../../../broadcastFiles/userfiles')
  // unlink file
  fs.unlink(dir + '/' + req.params.id, function (err) {
    if (err) {
      logger.serverLog(TAG, err, 'error')
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
              sendErrorResponse(res, 500, `The given domain is not whitelisted. Please add it to whitelisted domains.`)
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
      sendErrorResponse(res, 500, `Failed to delete url ${JSON.stringify(error)}`)
    })
}

exports.download = function (req, res) {
  let dir = path.resolve(__dirname, '../../../../broadcastFiles/userfiles')
  try {
    res.sendfile(req.params.id, {root: dir})
  } catch (err) {
    logger.serverLog(TAG,
      `Inside Download file, err = ${JSON.stringify(err)}`, 'error')
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
  logger.serverLog(TAG, `req.files.file ${JSON.stringify(req.files.file.path)}`, 'debug')
  logger.serverLog(TAG, `req.files.file ${JSON.stringify(req.files.file.name)}`, 'debug')
  logger.serverLog(TAG, `dir ${JSON.stringify(dir)}`, 'debug')
  logger.serverLog(TAG, `serverPath ${JSON.stringify(serverPath)}`, 'debug')

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
      logger.serverLog(TAG, `Failed to upload file ${JSON.stringify(err)}`)
      sendErrorResponse(res, 500, '', 'An expexted error occured while uploading the file. See server logs for more info.')
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
        next(err)
      })
  } else {
    next(null)
  }
}

const _refreshPageAccessToken = (filedata, next) => {
  if (filedata.pages && filedata.pages !== 'undefined' && filedata.pages.length > 0) {
    needle('get', `https://graph.facebook.com/v2.10/${filedata.page.pageId}?fields=access_token&access_token=${filedata.page.userId.facebookInfo.fbToken}`)
      .then(response => {
        if (response.body.error) {
          next(response.body.error)
        } else {
          filedata.pageAccessToken = response.body.access_token
          next(null, filedata)
        }
      })
      .catch(err => {
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
        'uri': 'https://graph.facebook.com/v2.6/me/message_attachments?access_token=' + filedata.pageAccessToken
      },
      function (err, resp) {
        if (err) {
          next(err)
        } else if (resp.body.error) {
          next(resp.body.error)
        } else {
          logger.serverLog(TAG, `file uploaded on Facebook ${JSON.stringify(resp.body)}`)
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
      logger.serverLog(TAG, `Failed to upload file ${JSON.stringify(err)}`)
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
    logger.serverLog(TAG, 'Parameters are missing.', 'error')
    sendErrorResponse(res, 400, '', 'Please fill all the required fields')
  } else {
    logger.serverLog(TAG, `Send Broadcast endpoint is hit ${JSON.stringify(req.body)}`, 'debug')
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
        logger.serverLog(TAG, err)
        sendErrorResponse(res, 500, `Failed to fetch page see server logs for more info`)
      })
  }
}

const sendBroadcastToSubscribers = (page, payload, req, res) => {
  BroadcastDataLayer.createForBroadcast(broadcastUtility.prepareBroadCastPayload(req, req.user.companyId))
    .then(broadcast => {
      logger.serverLog(TAG, `broadcast created ${JSON.stringify(broadcast)}`, 'debug')
      logger.serverLog(TAG, `creating message blocks ${JSON.stringify(req.body)}`, 'debug')
      createMessageBlocks(req.body.linkedMessages, req.user, broadcast._id, 'broadcast')
        .then(results => {
          // ...
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
                logger.serverLog(TAG, error)
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
                      logger.serverLog(TAG, err)
                      sendErrorResponse(res, 500, 'Failed to fetch tag subscribers')
                    })
                })
                .catch(err => {
                  logger.serverLog(TAG, err)
                  sendErrorResponse(res, 500, 'Failed to fetch tags')
                })
            } else {
              sendUsingBatchAPI('broadcast', payload, {criteria: subsFindCriteria}, page, req.user, reportObj, _savePageBroadcast, pageBroadcastData)
              sendSuccessResponse(res, 200, '', 'Conversation sent successfully!')
            }
          }
        })
        .catch(err => {
          logger.serverLog(TAG, err)
          sendErrorResponse(res, 500, `Failed to create linked message blocks ${err}`)
        })
    })
    .catch(err => {
      logger.serverLog(TAG, err)
      sendErrorResponse(res, 'Failed to create broadcast see server logs for more info')
    })
}

const _savePageBroadcast = (data) => {
  BroadcastPageDataLayer.createForBroadcastPage(data)
    .then(savedpagebroadcast => {
      require('../../global/messageStatistics').record('broadcast')
      logger.serverLog(TAG, 'page broadcast object saved in db')
    })
    .catch(error => {
      logger.serverLog(`Failed to create page_broadcast ${JSON.stringify(error)}`)
    })
}

const sendBroadcast = (batchMessages, page, res, subscriberNumber, subscribersLength, testBroadcast) => {
  const r = request.post('https://graph.facebook.com', (err, httpResponse, body) => {
    body = JSON.parse(body)
    logger.serverLog(TAG, `sendBroadcast Batch send response ${JSON.stringify(body)}`, 'debug')
    if (err) {
      logger.serverLog(TAG, `Batch send error ${JSON.stringify(err)}`, 'error')
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
      logger.serverLog(TAG,
        `subscriptionUser ${subscriptionUser}`, 'debug')
      utility.callApi(`user/query`, 'post', {_id: subscriptionUser.userId})
        .then(user => {
          user = user[0]
          logger.serverLog(TAG,
            `user ${JSON.stringify(user)}`, 'debug')
          let temp = user.facebookInfo.name.split(' ')
          let fname = temp[0]
          let lname = temp[1] ? temp[1] : ''
          broadcastUtility.getBatchData(payload, subscriptionUser.subscriberId, page, sendBroadcast, fname, lname, res, null, null, req.body.fbMessageTag, testBroadcast)
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch user ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
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
          sendErrorResponse(res, 500, `Failed to retrieve reach estimation ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch page ${JSON.stringify(error)}`)
    })
}

exports.urlMetaData = (req, res) => {
  let url = req.body.url
  if (url) {
    let options = {url}
    ogs(options, (error, results) => {
      if (!error) {
        return res.status(200).json({
          status: 'success',
          payload: results.data
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
        _getSubscribersCount(req.body.pageAccessToken, match, res)
      })
      .catch(err => {
        logger.serverLog(TAG, err)
        sendErrorResponse(res, 500, 'Failed to fetch list')
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
                _getSubscribersCount(req.body.pageAccessToken, match, res)
              } else if (req.body.segmentationTags.length > 0 && segmentationSurvey.length > 0) {
                let subscriberIds = _.intersection(tagSubscribers, surveySubscribers)
                match['_id'] = {$in: subscriberIds}
                _getSubscribersCount(req.body.pageAccessToken, match, res)
              } else if (segmentationSurvey.length > 0) {
                match['_id'] = {$in: surveySubscribers}
                _getSubscribersCount(req.body.pageAccessToken, match, res)
              } else if (segmentationPoll.length > 0) {
                match['_id'] = {$in: pollSubscribers}
                _getSubscribersCount(req.body.pageAccessToken, match, res)
              } else if (req.body.segmentationTags.length > 0) {
                match['_id'] = {$in: tagSubscribers}
                _getSubscribersCount(req.body.pageAccessToken, match, res)
              } else {
                match['_id'] = []
                _getSubscribersCount(req.body.pageAccessToken, match, res)
              }
            })
            .catch(err => {
              logger.serverLog(TAG, err)
            })
        })
        .catch(err => {
          logger.serverLog(TAG, err)
          sendErrorResponse(res, 500, 'Failed to fetch tags')
        })
    } else {
      _getSubscribersCount(req.body.pageAccessToken, match, res)
    }
  } else {
    _getSubscribersCount(req.body.pageAccessToken, match, res)
  }
}

const _getSubscribersCount = (pageAccessToken, match, res) => {
  isApprovedForSMP({accessToken: pageAccessToken})
    .then(smpStatus => {
      let smp = false
      if ((smpStatus === 'approved')) {
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
              cb(err)
            })
        }
      ], 10, function (err, results) {
        if (err) {
          logger.serverLog(TAG, err)
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
      logger.serverLog(TAG, err)
      sendErrorResponse(res, 500, 'Failed to get subscribers count')
    })
}

exports.sendBroadcast = sendBroadcast
