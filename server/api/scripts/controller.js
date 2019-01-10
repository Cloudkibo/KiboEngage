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
      console.log('pages fetched in script', pages.length)
      for (let i = 0; i < pages.length; i++) {
        utility.callApi(`pages/whitelistDomain`, 'post', {page_id: pages[i].pageId, whitelistDomains: [`${config.domain}`]}, req.headers.authorization)
          .then(whitelistDomains => {
            console.log('whitelistDomains', whitelistDomains)
          })
          .catch(error => {
            console.log('error in whitelisting domain', error)
          })
      }
    })
    .catch(error => {
      console.log('error in fetching pages', error)
    })
  return res.status(200).json({status: 'success', payload: 'Domain has been whitelisted'})
}
