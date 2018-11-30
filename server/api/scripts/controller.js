const TAG = 'api/scripts/controller'
const BroadcastPageDataLayer = require('../v1/page_broadcast/page_broadcast.datalayer')
const PollPageDataLayer = require('../v1/page_poll/page_poll.datalayer')
const SurveyPageDataLayer = require('../v1/page_survey/page_survey.datalayer')

exports.normalizeDataForDelivery = function (req, res) {
  BroadcastPageDataLayer.updateBroadcast({sent: null}, {sent: true}, {multi: true})
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
