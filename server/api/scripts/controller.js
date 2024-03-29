const TAG = 'api/scripts/controller'
const BroadcastPageDataLayer = require('../v1.1/page_broadcast/page_broadcast.datalayer')
const PollPageDataLayer = require('../v1.1/page_poll/page_poll.datalayer')
const SurveyPageDataLayer = require('../v1.1/page_survey/page_survey.datalayer')
const utility = require('../v1.1/utility')
let config = require('../../config/environment')
const needle = require('needle')
const BroadcastUtility = require('../v1.1/broadcasts/broadcasts.utility')
const logger = require('../../components/logger')
const request = require('request')
const { facebookApiCaller } = require('../global/facebookApiCaller.js')
const { sendOpAlert } = require('./../global/operationalAlert')
const { sendUsingBatchAPI } = require('../global/sendConversation')

exports.testCommonBatchAPI = function (req, res) {
  let payload = req.body.payload
  let accessToken = req.body.accessToken
  let subsCriteria = [
    {$match: {companyId: req.body.companyId, pageId: req.body.pageId}},
    {$limit: Math.floor(50 / payload.length)}
  ]
  sendUsingBatchAPI(payload, {criteria: subsCriteria}, accessToken, req.body.count, {successful: 0, unsuccessful: 0, errors: []})
  return res.status(200).json({status: 'success'})
}

exports.normalizeDataForDelivery = function (req, res) {
  BroadcastPageDataLayer.genericUpdate({sent: null}, {sent: true}, {multi: true})
    .then(result => {
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.normalizeDataForDelivery`, req.body, {user: req.user}, 'error')
    })
  PollPageDataLayer.genericUpdate({sent: null}, {sent: true}, {multi: true})
    .then(result => {
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.normalizeDataForDelivery`, req.body, {user: req.user}, 'error')
    })
  SurveyPageDataLayer.genericUpdate({sent: null}, {sent: true}, {multi: true})
    .then(result => {
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.normalizeDataForDelivery`, req.body, {user: req.user}, 'error')
    })
  return res.status(200).json({status: 'success', payload: 'Data has been normalized successfully!'})
}

exports.addWhitelistDomain = function (req, res) {
  utility.callApi(`pages/query`, 'post', {connected: true}, req.headers.authorization) // fetch connected pages
    .then(pages => {
      for (let i = 0; i < pages.length; i++) {
        if (pages[i].userId && pages[i].userId._id) {
          utility.callApi(`user/query`, 'post', {_id: pages[i].userId._id}, req.headers.authorization)
            .then(connectedUser => {
              connectedUser = connectedUser[0]
              if (connectedUser.facebookInfo) {
                needle.get(`https://graph.facebook.com/v6.0/${pages[i].pageId}?fields=access_token&access_token=${connectedUser.facebookInfo.fbToken}`,
                  (err, resp) => {
                    if (err) {
                    }
                    if (resp.body.error) {
                      sendOpAlert(resp.body.error, 'scripts in kiboengage', pages[i]._id, pages[i].userId, pages[i].companyId)
                    }
                    var accessToken = resp.body.access_token
                    needle.get(`https://graph.facebook.com/v6.0/me/messenger_profile?fields=whitelisted_domains&access_token=${accessToken}`, function (err, resp) {
                      if (err) {
                      }
                      if (resp.body.error) {
                        sendOpAlert(resp.body.error, 'scripts in kiboengage', pages[i]._id, pages[i].userId, pages[i].companyId)
                      }
                      var body = JSON.parse(JSON.stringify(resp.body))
                      let temp = []
                      if (body.data && body.data.length > 0 && body.data[0].whitelisted_domains) {
                        temp = body.data[0].whitelisted_domains
                      }
                      temp.push(`${config.domain}`)
                      let whitelistedDomains = {
                        whitelisted_domains: temp
                      }
                      let requesturl = `https://graph.facebook.com/v6.0/me/messenger_profile?access_token=${accessToken}`
                      needle.request('post', requesturl, whitelistedDomains, {json: true}, function (err, resp) {
                        if (err) {
                          const message = err || 'Internal Server Error'
                          logger.serverLog(message, `${TAG}: exports.addWhitelistDomain`, req.body, {user: req.user}, 'error')
                        }
                        if (resp.body.error) {
                          sendOpAlert(resp.body.error, 'scripts in kiboengage', pages[i]._id, pages[i].userId, pages[i].companyId)
                        }
                      })
                    })
                  })
              }
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.addWhitelistDomain`, req.body, {user: req.user}, 'error')
            })
        }
      }
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.addWhitelistDomain`, req.body, {user: req.user}, 'error')
    })
  return res.status(200).json({status: 'success', payload: 'Domain has been whitelisted'})
}

exports.performanceTestBroadcast = function (req, res) {
  const count = req.body.count
  const senderId = req.body.senderId
  const page = {
    accessToken: req.body.accessToken
  }
  if (req.body.apiName === 'send_api') {
    const payload = {
      messaging_type: 'NON_PROMOTIONAL_SUBSCRIPTION',
      recipient: {
        id: senderId
      },
      message: JSON.stringify({
        attachment: {
          type: 'video',
          payload: {
            url: 'https://video.twimg.com/ext_tw_video/1139077917709918209/pu/vid/1280x720/p5VpiXopUZ-UZv-l.mp4?tag=10'
          }
        }
      })
    }
    for (let i = 0; i < count; i++) {
      facebookApiCaller('v2.11', `me/messages?access_token=${page.AccessToken}`, 'post', payload)
        .then(response => {
          if (response.body.error) {
            sendOpAlert(response.body.error, 'scripts controller in kiboengage', page._id, page.userId, page.companyId)
            return res.status(500).json({status: 'failed', description: `Failed to send broadcast ${response.body.error}`})
          } else {
            if (i === count - 1) {
              return res.status(200).json({status: 'success', description: 'Broadcast has been sent successfully'})
            }
          }
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.performanceTestBroadcast`, req.body, {user: req.user}, 'error')
          return res.status(500).json({status: 'failed', description: `Failed to send broadcast ${err}`})
        })
    }
  } else if (req.body.apiName === 'batch_api') {
    const payload = [{
      componentType: 'video',
      fileurl: {
        attachment_id: req.body.attachment_id
      }
    }]
    for (let i = 0; i < count; i++) {
      BroadcastUtility.getBatchData(payload, senderId, page, sendBroadcast, 'Imran', 'Shoukat', res, i, count, 'NON_PROMOTIONAL_SUBSCRIPTION')
    }
  }
}

const sendBroadcast = (batchMessages, page, res, subscriberNumber, subscribersLength, testBroadcast) => {
  const r = request.post('https://graph.facebook.com', (err, httpResponse, body) => {
    if (err) {
      const message = err || 'Batch send error'
      logger.serverLog(message, `${TAG}: sendBroadcast`, body, {}, 'error')
      return res.status(500).json({
        status: 'failed',
        description: `Failed to send broadcast ${JSON.stringify(err)}`
      })
    }
    if (body.error) {
      sendOpAlert(body.error, 'scripts controller in kiboengage', page._id, page.userId, page.companyId)
    }
    // Following change is to incorporate persistant menu

    if (res === 'menu') {
      // we don't need to send res for persistant menu
    } else {
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
