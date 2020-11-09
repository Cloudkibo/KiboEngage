const logger = require('../../../components/logger')
const TAG = 'api/messengerEvents/welcomeMessage.controller.js'
const {callApi} = require('../utility')

exports.assignTag = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let resp = JSON.parse(req.body.entry[0].messaging[0].message.quick_reply.payload)
  const sender = req.body.entry[0].messaging[0].sender.id
  const pageId = req.body.entry[0].messaging[0].recipient.id
  callApi(`pages/query`, 'post', { pageId: pageId, connected: true })
    .then(page => {
      page = page[0]
      callApi(`subscribers/query`, 'post', { pageId: page._id, senderId: sender, companyId: page.companyId, completeInfo: true })
        .then(subscriber => {
          subscriber = subscriber[0]
          console.log('subscriber', subscriber)
          if (subscriber) {
            let subscriberTagsPayload = {
              tagId: resp.tagId,
              subscriberId: subscriber._id,
              companyId: subscriber.companyId
            }
            callApi(`tags_subscriber/query`, 'post', subscriberTagsPayload)
              .then(subscriberTag => {
                subscriberTag = subscriberTag[0]
                console.log('subscriberTag', subscriberTag)
                if (!subscriberTag) {
                  callApi(`tags_subscriber/`, 'post', subscriberTagsPayload)
                    .then(newRecord => {
                      console.log('tag assigned', newRecord)
                    })
                    .catch(err => {
                      const message = err || 'Failed to assign tag'
                      logger.serverLog(message, `${TAG}: exports.assignTag`, req.body, {}, 'error')
                    })
                }
              })
              .catch(err => {
                const message = err || 'Failed to tag subscriber'
                logger.serverLog(message, `${TAG}: exports.assignTag`, req.body, {}, 'error')
              })
          }
        })
        .catch(err => {
          const message = err || 'Failed to fetch subscriber'
          logger.serverLog(message, `${TAG}: exports.assignTag`, req.body, {}, 'error')
        })
    })
    .catch(err => {
      const message = err || 'Failed to fetch page'
      logger.serverLog(message, `${TAG}: exports.assignTag`, req.body, {}, 'error')
    })
}

exports.unAssignTag = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let resp = JSON.parse(req.body.entry[0].messaging[0].message.quick_reply.payload)
  const sender = req.body.entry[0].messaging[0].sender.id
  const pageId = req.body.entry[0].messaging[0].recipient.id
  callApi(`pages/query`, 'post', { pageId: pageId, connected: true })
    .then(page => {
      page = page[0]
      callApi(`subscribers/query`, 'post', { pageId: page._id, senderId: sender, companyId: page.companyId, completeInfo: true })
        .then(subscriber => {
          subscriber = subscriber[0]
          if (subscriber) {
            let subscriberTagsPayload = {
              tagId: resp.tagId,
              subscriberId: subscriber._id,
              companyId: subscriber.companyId
            }
            callApi(`tags_subscriber/query`, 'post', subscriberTagsPayload)
              .then(subscriberTag => {
                subscriberTag = subscriberTag[0]
                if (subscriberTag) {
                  callApi(`tags_subscriber/deleteMany`, 'post', subscriberTagsPayload)
                    .then(newRecord => {
                    })
                    .catch(err => {
                      const message = err || 'Failed to unassign tag'
                      logger.serverLog(message, `${TAG}: exports.unAssignTag`, req.body, {}, 'error')
                    })
                }
              })
              .catch(err => {
                const message = err || 'Failed to fetch subscriber tag'
                logger.serverLog(message, `${TAG}: exports.unAssignTag`, req.body, {}, 'error')
              })
          }
        })
        .catch(err => {
          const message = err || 'Failed to fetch subscriber'
          logger.serverLog(message, `${TAG}: exports.unAssignTag`, req.body, {}, 'error')
        })
    })
    .catch(err => {
      const message = err || 'Failed to fetch page'
      logger.serverLog(message, `${TAG}: exports.unAssignTag`, req.body, {}, 'error')
    })
}
