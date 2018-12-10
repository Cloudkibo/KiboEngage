const TAG = 'api/v1/messengerEvents/delivery.controller'
const BroadcastPageDataLayer = require('../page_broadcast/page_broadcast.datalayer')
const PollPageDataLayer = require('../page_poll/page_poll.datalayer')
const SurveyPageDataLayer = require('../page_survey/page_survey.datalayer')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  console.log(TAG, 'in delivery', JSON.stringify(req.body))
  updateBroadcastSent(req.body.entry[0].messaging[0])
  updatePollSent(req.body.entry[0].messaging[0])
  updateSurveySent(req.body.entry[0].messaging[0])
}

function updateBroadcastSent (req) {
  BroadcastPageDataLayer.genericUpdate({ pageId: req.recipient.id, subscriberId: req.sender.id, sent: false }, { sent: true }, { multi: true })
    .then(updated => {
      console.log(TAG, `Broadcast sent updated successfully`)
    })
    .catch(err => {
      console.log(TAG, `ERROR at updating broadcast sent ${JSON.stringify(err)}`)
    })
}

function updatePollSent (req) {
  PollPageDataLayer.genericUpdate({ pageId: req.recipient.id, subscriberId: req.sender.id, sent: false }, { sent: true }, { multi: true })
    .then(updated => {
      console.log(TAG, `Poll sent updated successfully`)
    })
    .catch(err => {
      console.log(TAG, `ERROR at updating poll sent ${JSON.stringify(err)}`)
    })
}

function updateSurveySent (req) {
  SurveyPageDataLayer.genericUpdate({ pageId: req.recipient.id, subscriberId: req.sender.id, sent: false }, { sent: true }, { multi: true })
    .then(updated => {
      console.log(TAG, `survey sent updated successfully`)
    })
    .catch(err => {
      console.log(TAG, `ERROR at updating survey sent ${JSON.stringify(err)}`)
    })
}
