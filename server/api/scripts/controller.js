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

exports.normalizeDataForDelivery = function (req, res) {
  BroadcastPageDataLayer.genericUpdate({sent: null}, {sent: true}, {multi: true})
    .then(result => {
    })
    .catch(err => {
    })
  PollPageDataLayer.genericUpdate({sent: null}, {sent: true}, {multi: true})
    .then(result => {
    })
    .catch(err => {
    })
  SurveyPageDataLayer.genericUpdate({sent: null}, {sent: true}, {multi: true})
    .then(result => {
    })
    .catch(err => {
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
                needle.get(`https://graph.facebook.com/v2.10/${pages[i].pageId}?fields=access_token&access_token=${connectedUser.facebookInfo.fbToken}`,
                  (err, resp) => {
                    if (err) {
                    }
                    var accessToken = resp.body.access_token
                    needle.get(`https://graph.facebook.com/v2.6/me/messenger_profile?fields=whitelisted_domains&access_token=${accessToken}`, function (err, resp) {
                      if (err) {
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
                      let requesturl = `https://graph.facebook.com/v2.6/me/messenger_profile?access_token=${accessToken}`
                      needle.request('post', requesturl, whitelistedDomains, {json: true}, function (err, resp) {
                        if (err) {
                        }
                      })
                    })
                  })
              }
            })
            .catch(error => {
            })
        }
      }
    })
    .catch(error => {
    })
  return res.status(200).json({status: 'success', payload: 'Domain has been whitelisted'})
}

exports.performanceTestBroadcast = function (req, res) {
  const count = req.body.count
  const senderId = req.body.senderId
  const pageAccessToken = req.body.accessToken
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
    facebookApiCaller('v2.11', `me/messages?access_token=${pageAccessToken}`, 'post', payload)
      .then(response => {
        if (response.body.error) {
          return res.status(500).json({status: 'failed', description: `Failed to send broadcast ${response.body.error}`})
        } else {
          if (i === count - 1) {
            return res.status(200).json({status: 'success', description: 'Broadcast has been sent successfully'})
          }
        }
      })
      .catch(err => {
        return res.status(500).json({status: 'failed', description: `Failed to send broadcast ${err}`})
      })
  }
}

const sendBroadcast = (batchMessages, page, res, subscriberNumber, subscribersLength, testBroadcast) => {
  const r = request.post('https://graph.facebook.com', (err, httpResponse, body) => {
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
