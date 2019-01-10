const TAG = 'api/scripts/controller'
const BroadcastPageDataLayer = require('../v1/page_broadcast/page_broadcast.datalayer')
const PollPageDataLayer = require('../v1/page_poll/page_poll.datalayer')
const SurveyPageDataLayer = require('../v1/page_survey/page_survey.datalayer')
const utility = require('../v1.1/utility')
let config = require('../../config/environment')

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
      for (let i = 0; i < pages.length; i++) {
        utility.callApi(`pages/whitelistDomain`, 'post', {page_id: pages[i].pageId, whitelistDomains: [`${config.domain}`]}, req.headers.authorization)
          .then(whitelistDomains => {
            return res.status(200).json({
              status: 'success',
              payload: whitelistDomains
            })
          })
          .catch(error => {
            return res.status(500).json({
              status: 'failed',
              description: `Failed to save whitelist domains ${JSON.stringify(error)}`
            })
          })
      }
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch connected pages ${JSON.stringify(error)}`
      })
    })
  return res.status(200).json({status: 'success', payload: 'Domain has been whitelisted'})
}
