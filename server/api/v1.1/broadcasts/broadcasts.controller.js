const BroadcastLogicLayer = require('./broadcasts.logiclayer')
const BroadcastDataLayer = require('./broadcasts.datalayer')
const BroadcastPageDataLayer = require('../page_broadcast/page_broadcast.datalayer')
const URLDataLayer = require('../URLForClickedCount/URL.datalayer')
const PageAdminSubscriptionDataLayer = require('../pageadminsubscriptions/pageadminsubscriptions.datalayer')
const logger = require('../../../components/logger')
const TAG = 'api/v1/broadcast/broadcasts.controller.js'
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

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      console.log('companyUser', companyUser)
      let criteria = BroadcastLogicLayer.getCriterias(req.body, companyUser)
      console.log('criteria', criteria)
      BroadcastDataLayer.countBroadcasts(criteria.countCriteria[0].$match)
        .then(broadcastsCount => {
          console.log('broadcastsCount', broadcastsCount)
          let aggregateMatch = criteria.finalCriteria[0].$match
          let aggregateSort = criteria.finalCriteria[1].$sort
          let aggregateSkip = criteria.finalCriteria[2].$skip
          let aggregateLimit = criteria.finalCriteria[3].$limit
          BroadcastDataLayer.aggregateForBroadcasts(aggregateMatch, undefined, undefined, aggregateLimit, aggregateSort, aggregateSkip)
            .then(broadcasts => {
              console.log('broadcasts', broadcasts)
              BroadcastPageDataLayer.genericFind({ companyId: companyUser.companyId })
                .then(broadcastpages => {
                  console.log('broadcastpages', broadcastpages)
                  res.status(200).json({
                    status: 'success',
                    payload: { broadcasts: broadcasts, count: broadcastsCount && broadcastsCount.length > 0 ? broadcastsCount[0].count : 0, broadcastpages: broadcastpages }
                  })
                  console.log('sent successfully')
                })
                .catch(error => {
                  return res.status(500).json({status: 'failed', payload: `Failed to fetch broadcasts pages ${JSON.stringify(error)}`})
                })
            })
            .catch(error => {
              return res.status(500).json({status: 'failed', payload: `Failed to fetch broadcasts ${JSON.stringify(error)}`})
            })
        })
        .catch(error => {
          return res.status(500).json({status: `failed ${error}`, payload: `Failed to fetch broadcasts count ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch company user ${JSON.stringify(error)}`})
    })
}
exports.delete = function (req, res) {
  let dir = path.resolve(__dirname, '../../../broadcastFiles/userfiles')
  // unlink file
  fs.unlink(dir + '/' + req.params.id, function (err) {
    if (err) {
      logger.serverLog(TAG, err)
      return res.status(404)
        .json({status: 'failed', description: 'File not found'})
    } else {
      return res.status(200)
        .json({status: 'success', payload: 'File deleted successfully'})
    }
  })
}
exports.addButton = function (req, res) {
  if (req.body.type === 'web_url' && !(_.has(req.body, 'url'))) {
    return res.status(500).json({
      status: 'failed',
      description: 'Url is required for type web_url.'
    })
  }
  if (req.body.type === 'postback' && !(_.has(req.body, 'sequenceId')) && !(_.has(req.body, 'action'))) {
    return res.status(500).json({
      status: 'failed',
      description: 'SequenceId & action are required for type postback'
    })
  }
  let buttonPayload = {
    title: req.body.title,
    type: req.body.type
  }
  if (req.body.type === 'web_url') {
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
              title: req.body.title, // User defined label
              messenger_extensions: req.body.messenger_extensions,
              webview_height_ratio: req.body.webview_height_ratio
            }
            return res.status(200).json({
              status: 'success',
              payload: webViewPayload
            })
          } else {
            return res.status(500).json({status: 'failed', payload: `The given domain is not whitelisted. Please add it to whitelisted domains.`})
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
          return res.status(200).json({
            status: 'success',
            payload: buttonPayload
          })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to save url ${JSON.stringify(error)}`})
        })
    }
  } else if (req.body.type === 'element_share') {
    return res.status(200).json({
      status: 'success',
      payload: {type: req.body.type}
    })
  } else {
    if (req.body.module.type === 'sequenceMessaging') {
      let buttonId = uniqid()
      buttonPayload.payload = JSON.stringify({
        sequenceId: req.body.sequenceId,
        action: req.body.action,
        buttonId: buttonId
      })
      buttonPayload.sequenceValue = req.body.sequenceId
      return res.status(200).json({
        status: 'success',
        payload: buttonPayload
      })
    }
  }
}
exports.editButton = function (req, res) {
  if (req.body.type === 'web_url' && !req.body.messenger_extensions && !(_.has(req.body, 'newUrl'))) {
    return res.status(500).json({
      status: 'failed',
      description: 'Url is required for type web_url.'
    })
  }
  if (req.body.type === 'postback' && !(_.has(req.body, 'sequenceId')) && !(_.has(req.body, 'action'))) {
    return res.status(500).json({
      status: 'failed',
      description: 'SequenceId & action are required for type postback'
    })
  }
  let buttonPayload = {
    title: req.body.title,
    type: req.body.type
  }
  if (req.body.type === 'web_url' && req.body.oldUrl) {
    // TODO save module id when sending broadcast
    let temp = req.body.oldUrl.split('/')
    let id = temp[temp.length - 1]
    URLDataLayer.updateOneURL(id, {originalURL: req.body.newUrl})
      .then(savedurl => {
        let newURL = config.domain + '/api/URL/broadcast/' + savedurl._id
        buttonPayload.newUrl = newURL
        buttonPayload.url = req.body.oldUrl
        return res.status(200).json({
          status: 'success',
          payload: { id: req.body.id, button: buttonPayload }
        })
      })
      .catch(error => {
        return res.status(500).json({status: 'failed', payload: `Failed to save url ${JSON.stringify(error)}`})
      })
  } else if (req.body.type === 'web_url' && (req.body.messenger_extensions || req.body.webview_height_ratio)) {
    if (!broadcastUtility.isWebView(req.body)) {
      return res.status(500).json({status: 'failed', payload: `parameters are missing`})
    }
    broadcastUtility.isWhiteListedDomain(req.body.url, req.body.pageId, req.user)
      .then(result => {
        if (result.returnValue) {
          return res.status(200).json({
            status: 'success',
            payload: req.body
          })
        } else {
          return res.status(500).json({status: 'failed', payload: `The given domain is not whitelisted. Please add it to whitelisted domains.`})
        }
      })
  } else {
    buttonPayload.payload = JSON.stringify({
      sequenceId: req.body.sequenceId,
      action: req.body.action
    })
    buttonPayload.sequenceValue = req.body.sequenceId
    return res.status(200).json({
      status: 'success',
      payload: { id: req.body.id, button: buttonPayload }
    })
  }
}
exports.deleteButton = function (req, res) {
  URLDataLayer.deleteOneURL(req.params.id)
    .then(deleted => {
      return res.status(200).json({
        status: 'success',
        description: 'Url deleted successfully!'
      })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to delete url ${JSON.stringify(error)}`})
    })
}

exports.download = function (req, res) {
  let dir = path.resolve(__dirname, '../../../../broadcastFiles/userfiles')
  try {
    res.sendfile(req.params.id, {root: dir})
  } catch (err) {
    logger.serverLog(TAG,
      `Inside Download file, err = ${JSON.stringify(err)}`)
    res.status(404)
      .json({status: 'success', payload: 'Not Found ' + JSON.stringify(err)})
  }
}

exports.upload = function (req, res) {
  var today = new Date()
  var uid = crypto.randomBytes(5).toString('hex')
  var serverPath = 'f' + uid + '' + today.getFullYear() + '' +
    (today.getMonth() + 1) + '' + today.getDate()
  serverPath += '' + today.getHours() + '' + today.getMinutes() + '' +
    today.getSeconds()
  let fext = req.files.file.name.split('.')
  serverPath += '.' + fext[fext.length - 1].toLowerCase()

  let dir = path.resolve(__dirname, '../../../../broadcastFiles/')

  if (req.files.file.size === 0) {
    return res.status(400).json({
      status: 'failed',
      description: 'No file submitted'
    })
  }
  logger.serverLog(TAG,
    `req.files.file ${JSON.stringify(req.files.file.path)}`)
  logger.serverLog(TAG,
    `req.files.file ${JSON.stringify(req.files.file.name)}`)
  logger.serverLog(TAG,
    `dir ${JSON.stringify(dir)}`)
  logger.serverLog(TAG,
    `serverPath ${JSON.stringify(serverPath)}`)
  fs.rename(
    req.files.file.path,
    dir + '/userfiles/' + serverPath,
    err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: 'internal server error' + JSON.stringify(err)
        })
      }
      // saving this file to send files with its original name
      // it will be deleted once it is successfully sent
      let readData = fs.createReadStream(dir + '/userfiles/' + serverPath)
      let writeData = fs.createWriteStream(dir + '/userfiles/' + req.files.file.name)
      readData.pipe(writeData)
      logger.serverLog(TAG,
        `file uploaded on KiboPush, uploading it on Facebook: ${JSON.stringify({
          id: serverPath,
          url: `${config.domain}/api/broadcasts/download/${serverPath}`
        })}`)
      if (req.body.pages && req.body.pages !== 'undefined' && req.body.pages.length > 0) {
        let pages = JSON.parse(req.body.pages)
        logger.serverLog(TAG, `Pages in upload file ${pages}`)
        utility.callApi(`pages/${pages[0]}`)
          .then(page => {
            needle.get(
              `https://graph.facebook.com/v2.10/${page.pageId}?fields=access_token&access_token=${page.userId.facebookInfo.fbToken}`,
              (err, resp2) => {
                if (err) {
                  return res.status(500).json({
                    status: 'failed',
                    description: 'unable to get page access_token: ' + JSON.stringify(err)
                  })
                }
                let pageAccessToken = resp2.body.access_token
                let fileReaderStream = fs.createReadStream(dir + '/userfiles/' + req.files.file.name)
                const messageData = {
                  'message': JSON.stringify({
                    'attachment': {
                      'type': req.body.componentType,
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
                    'uri': 'https://graph.facebook.com/v2.6/me/message_attachments?access_token=' + pageAccessToken
                  },
                  function (err, resp) {
                    if (err) {
                      return res.status(500).json({
                        status: 'failed',
                        description: 'unable to upload attachment on Facebook, sending response' + JSON.stringify(err)
                      })
                    } else {
                      logger.serverLog(TAG,
                        `file uploaded on Facebook ${JSON.stringify(resp.body)}`)
                      return res.status(201).json({
                        status: 'success',
                        payload: {
                          id: serverPath,
                          attachment_id: resp.body.attachment_id,
                          name: req.files.file.name,
                          url: `${config.domain}/api/broadcasts/download/${serverPath}`
                        }
                      })
                    }
                  })
              })
          })
          .catch(error => {
            return res.status(500).json({status: 'failed', payload: `Failed to fetch page ${JSON.stringify(error)}`})
          })
      } else {
        return res.status(201).json({
          status: 'success',
          payload: {
            id: serverPath,
            name: req.files.file.name,
            url: `${config.domain}/api/broadcasts/download/${serverPath}`
          }
        })
      }
    }
  )
}

exports.uploadForTemplate = function (req, res) {
  let dir = path.resolve(__dirname, '../../../../broadcastFiles/')
  console.log('req.body', req.body)
  utility.callApi(`pages/${req.body.pages[0]}`)
    .then(page => {
      console.log('page fetched', page)
      needle.get(
        `https://graph.facebook.com/v2.10/${page.pageId}?fields=access_token&access_token=${page.userId.facebookInfo.fbToken}`,
        (err, resp2) => {
          if (err) {
            return res.status(500).json({
              status: 'failed',
              description: 'unable to get page access_token: ' + JSON.stringify(err)
            })
          }
          let pageAccessToken = resp2.body.access_token
          let fileReaderStream = fs.createReadStream(dir + '/userfiles/' + req.body.name)
          const messageData = {
            'message': JSON.stringify({
              'attachment': {
                'type': req.body.componentType,
                'payload': {
                  'is_reusable': true
                }
              }
            }),
            'filedata': fileReaderStream
          }
          console.log('messageData', messageData)
          request(
            {
              'method': 'POST',
              'json': true,
              'formData': messageData,
              'uri': 'https://graph.facebook.com/v2.6/me/message_attachments?access_token=' + pageAccessToken
            },
            function (err, resp) {
              if (err) {
                console.log('error in uploading', err)
                return res.status(500).json({
                  status: 'failed',
                  description: 'unable to upload attachment on Facebook, sending response' + JSON.stringify(err)
                })
              } else {
                logger.serverLog(TAG,
                  `file uploaded on Facebook ${JSON.stringify(resp.body)}`)
                return res.status(201).json({
                  status: 'success',
                  payload: {
                    id: req.body.id,
                    attachment_id: resp.body.attachment_id,
                    name: req.body.name,
                    url: req.body.url
                  }
                })
              }
            })
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch page ${JSON.stringify(error)}`})
    })
}

exports.sendConversation = function (req, res) {
  logger.serverLog(TAG, `Sending Broadcast ${JSON.stringify(req.body)}`)
  // validate braodcast
  if (!broadcastUtility.validateInput(req.body)) {
    logger.serverLog(TAG, 'Parameters are missing.')
    return res.status(400)
      .json({status: 'failed', description: 'Please fill all the required fields'})
  }
  // restrict to one page
  if (req.body.segmentationPageIds.length !== 1) {
    return res.status(400)
      .json({status: 'failed', description: 'Please select only one page'})
  }
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      utility.callApi(`pages/query`, 'post', {companyId: companyUser.companyId, connected: true, _id: req.body.segmentationPageIds[0]}, req.headers.authorization)
        .then(page => {
          page = page[0]
          let payloadData = req.body.payload
          if (req.body.self) {
            let payload = updatePayload(req.body.self, payloadData)
            let interval = setInterval(() => {
              if (payload) {
                clearInterval(interval)
                sendTestBroadcast(companyUser, page, payload, req, res)
              }
            }, 3000)
          } else {
            BroadcastDataLayer.createForBroadcast(broadcastUtility.prepareBroadCastPayload(req, companyUser.companyId))
              .then(broadcast => {
                require('./../../../config/socketio').sendMessageToClient({
                  room_id: companyUser.companyId,
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
                if (req.body.isList === true) {
                  utility.callApi(`lists/query`, 'post', BroadcastLogicLayer.ListFindCriteria(req.body), req.headers.authorization)
                    .then(lists => {
                      let subsFindCriteria = BroadcastLogicLayer.subsFindCriteriaForList(lists, page)
                      let interval = setInterval(() => {
                        if (payload) {
                          clearInterval(interval)
                          sendToSubscribers(subsFindCriteria, req, res, page, broadcast, companyUser, payload)
                        }
                      }, 3000)
                    })
                    .catch(error => {
                      return res.status(500).json({status: 'failed', payload: `Failed to fetch lists ${JSON.stringify(error)}`})
                    })
                } else {
                  let subscriberFindCriteria = BroadcastLogicLayer.subsFindCriteria(req.body, page)
                  console.log('subsFindCriteria', subscriberFindCriteria)
                  let interval = setInterval(() => {
                    if (payload) {
                      clearInterval(interval)
                      sendToSubscribers(subscriberFindCriteria, req, res, page, broadcast, companyUser, payload)
                    }
                  }, 3000)
                }
              })
              .catch(error => {
                return res.status(500).json({status: 'failed', payload: `Failed to create broadcast ${JSON.stringify(error)}`})
              })
          }
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch pages ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch companyUser ${JSON.stringify(error)}`})
    })
}
const sendToSubscribers = (subscriberFindCriteria, req, res, page, broadcast, companyUser, payload) => {
  utility.callApi(`subscribers/query`, 'post', subscriberFindCriteria, req.headers.authorization)
    .then(subscribers => {
      broadcastUtility.applyTagFilterIfNecessary(req, subscribers, (taggedSubscribers) => {
        taggedSubscribers.forEach((subscriber, index) => {
          // update broadcast sent field
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
              broadcastUtility.getBatchData(payload, subscriber.senderId, page, sendBroadcast, subscriber.firstName, subscriber.lastName, res, index, taggedSubscribers.length, req.body.fbMessageTag)
            })
            .catch(error => {
              return res.status(500).json({status: 'failed', payload: `Failed to create page_broadcast ${JSON.stringify(error)}`})
            })
        })
      })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch subscribers ${JSON.stringify(error)}`})
    })
}
const sendBroadcast = (batchMessages, page, res, subscriberNumber, subscribersLength, testBroadcast) => {
  const r = request.post('https://graph.facebook.com', (err, httpResponse, body) => {
    console.log('Send Response Broadcast', body)
    if (err) {
      logger.serverLog(TAG, `Batch send error ${JSON.stringify(err)}`)
      return res.status(500).json({
        status: 'failed',
        description: `Failed to send broadcast ${JSON.stringify(err)}`
      })
    }
    // Following change is to incorporate persistant menu

    if (res === 'menu') {
      // we don't need to send res for persistant menu
    } else {
      logger.serverLog(TAG, `Batch send response ${JSON.stringify(body)}`)
      if (testBroadcast || (subscriberNumber === (subscribersLength - 1))) {
        return res.status(200)
          .json({status: 'success', description: 'Conversation sent successfully!'})
      }
    }
  })
  const form = r.form()
  form.append('access_token', page.accessToken)
  form.append('batch', batchMessages)
}
const updatePayload = (self, payload, broadcast) => {
  let shouldReturn = false
  logger.serverLog(TAG, `Update Payload: ${JSON.stringify(payload)}`)
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
              logger.serverLog(TAG, error)
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
        `subscriptionUser ${subscriptionUser}`)
      utility.callApi(`user/query`, 'post', {_id: subscriptionUser.userId}, req.headers.authorization)
        .then(user => {
          user = user[0]
          logger.serverLog(TAG,
            `user ${JSON.stringify(user)}`)
          let temp = user.facebookInfo.name.split(' ')
          let fname = temp[0]
          let lname = temp[1] ? temp[1] : ''
          broadcastUtility.getBatchData(payload, subscriptionUser.subscriberId, page, sendBroadcast, fname, lname, res, null, null, req.body.fbMessageTag, testBroadcast)
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch user ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch adminsubscription ${JSON.stringify(error)}`})
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
    return res.status(500).json({
      status: 'failed',
      description: 'Url is required for type web_url.'
    })
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
          return res.status(200).json({
            status: 'success',
            payload: webViewPayload
          })
        } else {
          return res.status(500).json({status: 'failed', payload: `The given domain is not whitelisted. Please add it to whitelisted domains.`})
        }
      })
      .catch(err => {
        return res.status(500).json({status: 'failed', payload: `Error at checking whitelist domain ${err}`})
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
        return res.status(200).json({
          status: 'success',
          payload: buttonPayload
        })
      })
      .catch(error => {
        return res.status(500).json({status: 'failed', payload: `Failed to save url ${JSON.stringify(error)}`})
      })
  }
}

exports.addListAction = function (req, res) {
  if (req.body.type === 'web_url' && !(_.has(req.body, 'url'))) {
    return res.status(500).json({
      status: 'failed',
      description: 'Url is required for type web_url.'
    })
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
          return res.status(200).json({
            status: 'success',
            payload: webViewPayload
          })
        } else {
          return res.status(500).json({status: 'failed', payload: `The given domain is not whitelisted. Please add it to whitelisted domains.`})
        }
      })
      .catch(err => {
        return res.status(500).json({status: 'failed', payload: `Error at checking whitelist domain ${err}`})
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
        return res.status(200).json({
          status: 'success',
          payload: buttonPayload
        })
      })
      .catch(error => {
        return res.status(500).json({status: 'failed', payload: `Failed to save url ${JSON.stringify(error)}`})
      })
  }
}

exports.sendBroadcast = sendBroadcast
