const TAG = 'api/v1/URLForClickedCount/url.controller.js'
const URLDataLayer = require('./URL.datalayer')
const AutopostingMessagesDataLayer = require('./../autopostingMessages/autopostingMessages.datalayer')
const BroadcastsDataLayer = require('./../broadcasts/broadcasts.datalayer')
const SequenceMessagesDataLayer = require('./../sequenceMessaging/sequence.datalayer')
const logger = require('../../../components/logger')
const sequenceUtility = require('./../sequenceMessaging/utility')

exports.index = function (req, res) {
  URLDataLayer.findOneURL(req.params.id)
    .then(URLObject => {
      AutopostingMessagesDataLayer.updateOneAutopostingMessage(URLObject.module.id, {$inc: {clicked: 1}})
        .then(updatedData => {
          res.writeHead(301, {Location: URLObject.originalURL})
          res.end()
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch update autoposting message ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch URL object ${JSON.stringify(err)}`)
    })
}

exports.broadcast = function (req, res) {
  URLDataLayer.findOneURL(req.params.id)
    .then(URLObject => {
      console.log('URLObject', URLObject)
      if (URLObject) {
        BroadcastsDataLayer.updateBroadcast({_id: URLObject.module.id}, {$inc: {clicks: 1}})
          .then(updatedData => {
            res.writeHead(301, {Location: URLObject.originalURL.startsWith('http') ? URLObject.originalURL : `https://${URLObject.originalURL}`})
            res.end()
          })
          .catch(err => {
            if (err) {
              return res.status(500).json({
                status: 'failed',
                description: `Internal Server Error ${JSON.stringify(err)}`
              })
            }
          })
      } else {
        res.status(400).json({
          status: 'failed',
          description: 'No URL found with id ' + req.params.id
        })
      }
    })
    .catch(err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
    })
}

exports.sequence = function (req, res) {
  logger.serverLog(`Sequence Click Count ${JSON.stringify(req.params.id)}`)
  URLDataLayer.findOneURL(req.params.id)
    .then(URLObject => {
      if (URLObject) {
        logger.serverLog(`Sequence Click Count ${JSON.stringify(URLObject)}`)
        SequenceMessagesDataLayer.genericUpdateForSequenceMessages({_id: URLObject.module.id}, {$inc: {clicks: 1}})
          .then(updatedData => {
            let seqMessageId = URLObject.module.id
            SequenceMessagesDataLayer.genericFindForSequenceMessages({_id: seqMessageId})
              .then(seqMessage => {
                if (seqMessage) {
                  // get sequenceId of the message
                  let sequenceId = seqMessage.sequenceId
                  // find the all the messages of this sequence
                  SequenceMessagesDataLayer.genericFindForSequenceMessages({sequenceId: sequenceId}, (err, seqMessages) => {
                    if (err) {
                      return res.status(500).json({
                        status: 'failed',
                        description: `Internal Server Error ${JSON.stringify(err)}`
                      })
                    }
                    if (seqMessages && seqMessages.length > 0) {
                      // iterate through all the messages of this sequence.
                      for (let message of seqMessages) {
                      // check if this message is in the trigger of any message of this sequence then add it to queue.
                        if (message.trigger.value !== '') {
                          if (message.trigger.value === seqMessageId) {
                            // add this message to queue.
                            sequenceUtility.addToMessageQueue(message.sequenceId, message.schedule.date, message._id)
                          }
                        }
                      }
                    }
                  })
                }
              })
              .catch(err => {
                if (err) {
                  return res.status(500).json({
                    status: 'failed',
                    description: `Internal Server Error ${JSON.stringify(err)}`
                  })
                }
              })
            res.writeHead(301, {Location: URLObject.originalURL.startsWith('http') ? URLObject.originalURL : `https://${URLObject.originalURL}`})
            res.end()
          })
          .catch(err => {
            if (err) {
              return res.status(500).json({
                status: 'failed',
                description: `Internal Server Error ${JSON.stringify(err)}`
              })
            }
          })
      } else {
        return res.status(400).json({
          status: 'failed',
          description: 'No URL found with id ' + req.params.id
        })
      }
    })
    .catch(err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
    })
}
