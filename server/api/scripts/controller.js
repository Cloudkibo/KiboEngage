const TAG = 'api/scripts/controller'
const BroadcastPageDataLayer = require('../page_broadcast/page_broadcast.datalayer')
const PollPageDataLayer = require('../page_poll/page_poll.datalayer')
const SurveyPageDataLayer = require('../page_survey/page_survey.datalayer')

exports.normalizeDataForDelivery = function (req, res) {
  BroadcastPageDataLayer.update({sent: null}, {sent: true}, {multi: true}).exec()
    .then(result => {
      console.log(TAG, 'Broadcast sent normalized successfully!')
    })
    .catch(err => {
      console.log(TAG, `Broadcast sent normalized failed ${err}`)
    })
  PollPageDataLayer.update({sent: null}, {sent: true}, {multi: true}).exec()
    .then(result => {
      console.log(TAG, 'Poll sent normalized successfully!')
    })
    .catch(err => {
      console.log(TAG, `Poll sent normalized failed ${err}`)
    })
  SurveyPageDataLayer.update({sent: null}, {sent: true}, {multi: true}).exec()
    .then(result => {
      console.log(TAG, 'Survey sent normalized successfully!')
    })
    .catch(err => {
      console.log(TAG, `Survey sent normalized failed ${err}`)
    })
  res.status(200).json({status: 'success', payload: 'Data has been normalized successfully!'})
}
