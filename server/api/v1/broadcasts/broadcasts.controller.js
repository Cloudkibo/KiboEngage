const BroadcastLogicLayer = require('./broadcasts.logiclayer')
const BroadcastDataLayer = require('./broadcasts.datalayer')
const BroadcastPageDataLayer = require('../page_broadcast.datalayer')
const URLDataLayer = require('../URLforClickedCount/URL.datalayer')
const logger = require('../../../components/logger')
const TAG = 'api/v1/broadcast/broadcasts.controller.js'
const utility = require('../utility')
const needle = require('needle')
const path = require('path')
const fs = require('fs')
let config = require('./../../../config/environment')
const uniqid = require('uniqid')
let _ = require('lodash')
const mongoose = require('mongoose')
let request = require('request')
const crypto = require('crypto')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      let criteria = BroadcastLogicLayer.getCriterias(req.body, companyUser)
      BroadcastDataLayer.aggregateForBroadcasts(criteria.countCriteria)
        .then(broadcastsCount => {
          BroadcastDataLayer.aggregateForBroadcasts(criteria.finalCriteria)
            .then(broadcasts => {
              BroadcastPageDataLayer.genericFind({ companyId: companyUser.companyId })
                .then(broadcastpages => {
                  res.status(200).json({
                    status: 'success',
                    payload: { broadcasts: req.body.first_page === 'previous' ? broadcasts.reverse() : broadcasts, count: broadcastsCount && broadcastsCount.length > 0 ? broadcastsCount[0].count : 0, broadcastpages: broadcastpages }
                  })
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
          return res.status(500).json({status: 'failed', payload: `Failed to fetch broadcasts count ${JSON.stringify(error)}`})
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
  if (req.body.type === 'web_url' && !(_.has(req.body, 'newUrl'))) {
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
    URLDataLayer.updateOneURL(mongoose.Types.ObjectId(id), {originalURL: req.body.newUrl})
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
  URLDataLayer.deleteOneURL(mongoose.Types.ObjectId(req.params.id))
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
exports.upload = function (req, res) {
  let pages = JSON.parse(req.body.pages)
  logger.serverLog(TAG, `Pages in upload file ${pages}`)
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
      utility.callApi(`pages/${mongoose.Types.ObjectId(pages[0])}`)
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
    }
  )
}
