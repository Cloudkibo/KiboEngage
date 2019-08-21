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
const { batchApi } = require('../../global/batchApi')
const broadcastApi = require('../../global/broadcastApi')
const validateInput = require('../../global/validateInput')
const { facebookApiCaller } = require('../../global/facebookApiCaller')
const util = require('util')
const async = require('async')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const urlMetadata = require('url-metadata')

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
  if (req.body.type === 'web_url' && !(_.has(req.body, 'url'))) {
    sendErrorResponse(res, 500, '', 'Url is required for type web_url.')
  }
  if (req.body.type === 'postback' && !(_.has(req.body, 'sequenceId')) && !(_.has(req.body, 'action'))) {
    sendErrorResponse(res, 500, '', 'SequenceId & action are required for type postback')
  }
  let buttonPayload = {
    title: req.body.title,
    type: req.body.type
  }
  if (req.body.type === 'web_url') {
    if (req.body.messenger_extensions || req.body.webview_height_ratio) {
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
            sendSuccessResponse(res, 200, webViewPayload)
          } else {
            sendErrorResponse(res, 500, `The given domain is not whitelisted. Please add it to whitelisted domains.`)
          }
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
  } else if (req.body.type === 'element_share') {
    sendSuccessResponse(res, 200, {type: req.body.type})
  } else {
    if (req.body.module.type === 'sequenceMessaging') {
      let buttonId = uniqid()
      buttonPayload.payload = JSON.stringify({
        sequenceId: req.body.sequenceId,
        action: req.body.action,
        buttonId: buttonId
      })
      buttonPayload.sequenceValue = req.body.sequenceId
      sendSuccessResponse(res, 200, buttonPayload)
    }
  }
}
exports.editButton = function (req, res) {
  if (req.body.type === 'web_url' && !req.body.messenger_extensions && !(_.has(req.body, 'newUrl'))) {
    sendErrorResponse(res, 400, '', 'Url is required for type web_url.')
  }
  if (req.body.type === 'postback' && !(_.has(req.body, 'sequenceId')) && !(_.has(req.body, 'action'))) {
    sendErrorResponse(res, 400, '', 'SequenceId & action are required for type postback')
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
  } else if (req.body.type === 'element_share') {
    buttonPayload = {
      type: req.body.type
    }
    sendSuccessResponse(res, 200, {id: req.body.id, button: buttonPayload})
  } else {
    buttonPayload.payload = JSON.stringify({
      sequenceId: req.body.sequenceId,
      action: req.body.action
    })
    buttonPayload.sequenceValue = req.body.sequenceId
    sendSuccessResponse(res, 200, { id: req.body.id, button: buttonPayload })
  }
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
  logger.serverLog(TAG, `Sending Broadcast ${JSON.stringify(req.body)}`, 'debug')
  // validate braodcast
  if (!validateInput.facebookBroadcast(req.body)) {
    logger.serverLog(TAG, 'Parameters are missing.', 'error')
    sendErrorResponse(res, 400, '', 'Please fill all the required fields')
  }
  // restrict to one page
  if (req.body.segmentationPageIds.length !== 1) {
    sendErrorResponse(res, 400, '', 'Please select only one page')
  }
  utility.callApi(`pages/query`, 'post', {companyId: req.user.companyId, connected: true, _id: req.body.segmentationPageIds[0]})
    .then(page => {
      page = page[0]
      let payloadData = req.body.payload
      if (req.body.self) {
        let payload = updatePayload(req.body.self, payloadData)
        let interval = setInterval(() => {
          if (payload) {
            clearInterval(interval)
            sendTestBroadcast(req.user, page, payload, req, res)
          }
        }, 3000)
      } else {
        BroadcastDataLayer.createForBroadcast(broadcastUtility.prepareBroadCastPayload(req, req.user.companyId))
          .then(broadcast => {
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
            let payload = updatePayload(req.body.self, payloadData, broadcast)
            broadcastUtility.addModuleIdIfNecessary(payloadData, broadcast._id) // add module id in buttons for click count
            // condition to decide broadcast or batch api
            if (page.subscriberLimitForBatchAPI < req.body.subscribersCount) {
              let interval = setInterval(() => {
                if (payload) {
                  clearInterval(interval)
                  sentUsinInterval(payload, page, broadcast, req, res, 3000)
                }
              }, 3000)
            } else {
              if (req.body.isList === true) {
                utility.callApi(`lists/query`, 'post', BroadcastLogicLayer.ListFindCriteria(req.body, req.user))
                  .then(lists => {
                    let subsFindCriteria = BroadcastLogicLayer.subsFindCriteriaForList(lists, page)
                    let interval = setInterval(() => {
                      if (payload) {
                        clearInterval(interval)
                        sendToSubscribers(subsFindCriteria, req, res, page, broadcast, req.user, payload)
                      }
                    }, 3000)
                  })
                  .catch(error => {
                    sendErrorResponse(res, 500, `Failed to fetch lists ${JSON.stringify(error)}`)
                  })
              } else {
                let subscriberFindCriteria = BroadcastLogicLayer.subsFindCriteria(req.body, page)
                let interval = setInterval(() => {
                  if (payload) {
                    clearInterval(interval)
                    sendToSubscribers(subscriberFindCriteria, req, res, page, broadcast, req.user, payload)
                  }
                }, 3000)
              }
            }
          })
          .catch(error => {
            sendErrorResponse(res, 500, `Failed to create broadcast ${JSON.stringify(error)}`)
          })
      }
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch pages ${JSON.stringify(error)}`)
    })
}
const sendToSubscribers = (subscriberFindCriteria, req, res, page, broadcast, companyUser, payload) => {
  utility.callApi(`subscribers/query`, 'post', subscriberFindCriteria)
    .then(subscribers => {
      if (subscribers.length < 1) {
        sendErrorResponse(res, 500, '', `No subscribers match the selected criteria`)
      }
      broadcastUtility.applyTagFilterIfNecessary(req, subscribers, (taggedSubscribers) => {
        taggedSubscribers.forEach((subscriber, index) => {
          BroadcastPageDataLayer.createForBroadcastPage({
            pageId: page.pageId,
            userId: req.user._id,
            subscriberId: subscriber.senderId,
            broadcastId: broadcast._id,
            seen: false,
            sent: false,
            companyId: companyUser.companyId
          })
            .then(savedpagebroadcast => {
              require('../../global/messageStatistics').record('broadcast')
              batchApi(payload, subscriber.senderId, page, sendBroadcast, subscriber.firstName, subscriber.lastName, res, index, taggedSubscribers.length, req.body.fbMessageTag)
            })
            .catch(error => {
              sendErrorResponse(res, 500, `Failed to create page_broadcast ${JSON.stringify(error)}`)
            })
        })
      }, res)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch subscribers ${JSON.stringify(error)}`)
    })
}

let successfullySent = 0

const sendBroadcast = (batchMessages, page, res, subscriberNumber, subscribersLength, testBroadcast) => {
  const r = request.post('https://graph.facebook.com', (err, httpResponse, body) => {
    body = JSON.parse(body)
    logger.serverLog(TAG, `sendBroadcast Batch send response ${JSON.stringify(body)}`, 'debug')
    if (body[0].code === 200) {
      successfullySent += 1
    }
    if (err) {
      logger.serverLog(TAG, `Batch send error ${JSON.stringify(err)}`, 'error')
      sendErrorResponse(res, 500, `Failed to send broadcast ${JSON.stringify(err)}`)
    }

    // Following change is to incorporate persistant menu

    if (res === 'menu') {
      // we don't need to send res for persistant menu
    } else {
      if (testBroadcast || (successfullySent === (subscribersLength))) {
        successfullySent = 0
        logger.serverLog(TAG, `Conversation sent successfully ${JSON.stringify(body)}`, 'debug')
        sendSuccessResponse(res, 200, '', 'Conversation sent successfully!')
      } else if (subscriberNumber === (subscribersLength - 1)) {
        logger.serverLog(TAG, `Failed to send broadcast to all subscribers ${err}`, 'debug')
        sendErrorResponse(res, 500, `Failed to send broadcast to all subscribers ${JSON.stringify(err)}`)
      }
    }
  })
  const form = r.form()
  form.append('access_token', page.accessToken)
  form.append('batch', batchMessages)
}
const updatePayload = (self, payload, broadcast) => {
  let shouldReturn = false
  logger.serverLog(TAG, `Update Payload: ${JSON.stringify(payload)}`, 'debug')
  for (let j = 0; j < payload.length; j++) {
    if (!self && payload[j].componentType === 'list') {
      payload[j].listItems.forEach((element, lindex) => {
        if (element.default_action && !element.default_action.messenger_extensions) {
          URLDataLayer.createURLObject({
            originalURL: element.default_action.url,
            module: {
              id: broadcast._id,
              type: 'broadcast'
            }
          })
            .then(savedurl => {
              let newURL = config.domain + '/api/URL/broadcast/' + savedurl._id
              payload[j].listItems[lindex].default_action.url = newURL
            })
            .catch(error => {
              logger.serverLog(TAG, error, 'error')
            })
        }
        if (lindex === (payload[j].listItems.length - 1)) {
          shouldReturn = operation(j, payload.length - 1)
        }
      })
    } else {
      shouldReturn = operation(j, payload.length - 1)
    }
  }
  if (shouldReturn) {
    return payload
  }
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
const operation = (index, length) => {
  if (index === length) {
    return true
  } else {
    return false
  }
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

exports.addListAction = function (req, res) {
  if (req.body.type === 'web_url' && !(_.has(req.body, 'url'))) {
    sendErrorResponse(res, 400, 'Url is required for type web_url.')
  }
  let buttonPayload = {
    type: req.body.type
  }
  if (req.body.messenger_extensions || req.body.webview_height_ratio) {
    if (!broadcastUtility.isWebView(req.body)) {
      sendErrorResponse(res, 400, `parameters are missing`)
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

const sentUsinInterval = function (payload, page, broadcast, req, res, delay) {
  let current = 0
  let interval = setInterval(() => {
    if (current === payload.length) {
      clearInterval(interval)
      logger.serverLog(TAG, `Conversation sent successfully using interval ${JSON.stringify(payload)}`, 'debug')
      sendSuccessResponse(res, 200, '', 'Conversation sent successfully!')
    } else {
      broadcastApi.callMessageCreativesEndpoint(payload[current], page.accessToken)
        .then(messageCreative => {
          logger.serverLog(TAG, `messageCreative ${util.inspect(messageCreative)}`)
          if (messageCreative.status === 'success') {
            const messageCreativeId = messageCreative.message_creative_id
            utility.callApi('tags/query', 'post', {companyId: req.user.companyId, pageId: page._id})
              .then(pageTags => {
                const limit = Math.ceil(req.body.subscribersCount / 10000)
                for (let i = 0; i < limit; i++) {
                  let labels = []
                  let unsubscribeTag = pageTags.filter((pt) => pt.tag === `_${page.pageId}_unsubscribe`)
                  let pageIdTag = pageTags.filter((pt) => pt.tag === `_${page.pageId}_${i + 1}`)
                  let notlabels = unsubscribeTag.length > 0 && [unsubscribeTag[0].labelFbId]
                  pageIdTag.length > 0 && labels.push(pageIdTag[0].labelFbId)
                  if (req.body.isList) {
                    utility.callApi(`lists/query`, 'post', BroadcastLogicLayer.ListFindCriteria(req.body, req.user))
                      .then(lists => {
                        lists = lists.map((l) => l.listName)
                        let temp = pageTags.filter((pt) => lists.includes(pt.tag)).map((pt) => pt.labelFbId)
                        labels = labels.concat(temp)
                      })
                      .catch(err => {
                        sendErrorResponse(res, 500, `Failed to apply list segmentation ${JSON.stringify(err)}`)
                      })
                  } else {
                    if (req.body.segmentationGender.length > 0) {
                      let temp = pageTags.filter((pt) => req.body.segmentationGender.includes(pt.tag)).map((pt) => pt.labelFbId)
                      labels = labels.concat(temp)
                    }
                    if (req.body.segmentationLocale.length > 0) {
                      let temp = pageTags.filter((pt) => req.body.segmentationLocale.includes(pt.tag)).map((pt) => pt.labelFbId)
                      labels = labels.concat(temp)
                    }
                    if (req.body.segmentationTags.length > 0) {
                      let temp = pageTags.filter((pt) => req.body.segmentationTags.includes(pt._id)).map((pt) => pt.labelFbId)
                      labels = labels.concat(temp)
                    }
                  }
                  broadcastApi.callBroadcastMessagesEndpoint(messageCreativeId, labels, notlabels, page.accessToken)
                    .then(response => {
                      logger.serverLog(TAG, `broadcastApi response ${util.inspect(response)}`)
                      if (i === limit - 1) {
                        if (response.status === 'success') {
                          utility.callApi('broadcasts', 'put', {purpose: 'updateOne', match: {_id: broadcast._id}, updated: {messageCreativeId, broadcastFbId: response.broadcast_id, APIName: 'broadcast_api'}}, 'kiboengage')
                            .then(updated => {
                              current++
                            })
                            .catch(err => {
                              sendErrorResponse(res, 500, `Failed to send broadcast ${JSON.stringify(err)}`)
                            })
                        } else {
                          sendErrorResponse(res, 500, `Failed to send broadcast ${JSON.stringify(response.description)}`)
                        }
                      }
                    })
                    .catch(err => {
                      sendErrorResponse(res, 500, `Failed to send broadcast ${JSON.stringify(err)}`)
                    })
                }
              })
              .catch(err => {
                sendErrorResponse(res, 500, `Failed to find tags ${JSON.stringify(err)}`)
              })
          } else {
            sendErrorResponse(res, 500, `Failed to send broadcast ${JSON.stringify(messageCreative.description)}`)
          }
        })
        .catch(err => {
          sendErrorResponse(res, 500, `Failed to send broadcast ${JSON.stringify(err)}`)
        })
    }
  }, delay)
}

exports.urlMetaData = (req, res) => {
  let url = req.body.url
  // console.log('urlMetaData req.body', req.body)
  if (url) {
    urlMetadata(url).then((metadata) => {
      return res.status(200).json({
        status: 'success',
        payload: metadata
      })
    }, (err) => {
      return res.status(500).json({
        status: 'failed',
        description: `Failed to retrieve url ${err}`
      })
    })
  } else {
    res.status(400).json({
      status: 'failed',
      description: 'url not given in paramater'
    })
  }
}

exports.sendBroadcast = sendBroadcast
