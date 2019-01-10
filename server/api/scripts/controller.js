const TAG = 'api/scripts/controller'
const BroadcastPageDataLayer = require('../v1/page_broadcast/page_broadcast.datalayer')
const PollPageDataLayer = require('../v1/page_poll/page_poll.datalayer')
const SurveyPageDataLayer = require('../v1/page_survey/page_survey.datalayer')
const utility = require('../v1.1/utility')
let config = require('../../config/environment')
const needle = require('needle')

exports.normalizeDataForDelivery = function (req, res) {
  BroadcastPageDataLayer.genericUpdate({sent: null}, {sent: true}, {multi: true})
    .then(result => {
      console.log(TAG, 'Broadcast sent normalized successfully!')
    })
    .catch(err => {
      console.log(TAG, `Broadcast sent normalized failed ${err}`)
    })
  PollPageDataLayer.genericUpdate({sent: null}, {sent: true}, {multi: true})
    .then(result => {
      console.log(TAG, 'Poll sent normalized successfully!')
    })
    .catch(err => {
      console.log(TAG, `Poll sent normalized failed ${err}`)
    })
  SurveyPageDataLayer.genericUpdate({sent: null}, {sent: true}, {multi: true})
    .then(result => {
      console.log(TAG, 'Survey sent normalized successfully!')
    })
    .catch(err => {
      console.log(TAG, `Survey sent normalized failed ${err}`)
    })
  return res.status(200).json({status: 'success', payload: 'Data has been normalized successfully!'})
}

exports.addWhitelistDomain = function (req, res) {
  utility.callApi(`pages/query`, 'post', {connected: true}, req.headers.authorization) // fetch connected pages
    .then(pages => {
      console.log('pages fetched in script', pages.length)
      for (let i = 0; i < pages.length; i++) {
        utility.callApi(`user/query`, 'post', {_id: pages[i].userId}, req.headers.authorization)
          .then(connectedUser => {
            connectedUser = connectedUser[0]
            if (connectedUser.facebookInfo) {
              needle.get(`https://graph.facebook.com/v2.10/${pages[i].pageId}?fields=access_token&access_token=${connectedUser.facebookInfo.fbToken}`,
                (err, resp) => {
                  if (err) {
                    console.log('error in getting page access token', err)
                  }
                  var accessToken = resp.body.access_token
                  needle.get(`https://graph.facebook.com/v2.6/me/messenger_profile?fields=whitelisted_domains&access_token=${accessToken}`, function (err, resp) {
                    if (err) {
                      console.log('error in whitelisted_domains', err)
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
                    console.log('whitelistdomains', whitelistedDomains)
                    let requesturl = `https://graph.facebook.com/v2.6/me/messenger_profile?access_token=${accessToken}`
                    needle.request('post', requesturl, whitelistedDomains, {json: true}, function (err, resp) {
                      if (err) {
                        console.log('error in whitelisted_domains', err)
                      }
                      console.log('response from whitelisted_domains', resp.body)
                    })
                  })
                })
            }
          })
          .catch(error => {
            console.log('Failed to fetch user', error)
          })
      }
    })
    .catch(error => {
      console.log('error in fetching pages', error)
    })
  return res.status(200).json({status: 'success', payload: 'Domain has been whitelisted'})
}
