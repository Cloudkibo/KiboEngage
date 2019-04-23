const logger = require('../../../components/logger')
const TAG = 'api/sequenceMessaging/logiclayer.js'
const SequenceMessageQueueDatalayer = require('../sequenceMessageQueue/sequenceMessageQueue.datalayer')
const SequenceDatalayer = require('./sequence.datalayer')

function addToMessageQueue (sequenceId, scheduleDate, messageId, subscriberId, companyId) {
  let sequenceQueuePayload = {
    sequenceId: sequenceId,
    subscriberId: subscriberId,
    companyId: companyId,
    sequenceMessageId: messageId,
    queueScheduledTime: scheduleDate
  }
  SequenceMessageQueueDatalayer.create(sequenceQueuePayload)
    .then(result => {
      logger.serverLog(TAG, 'Message queue created')
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to insert record in message queue ${err}`)
    })
}

function checkParentMessageTrigger (message) {
  SequenceDatalayer.genericFindForSequenceMessages({_id: message.trigger.value})
    .then(foundMessage => {
      if (foundMessage.trigger.event === 'none') {
        let utcDate = setScheduleDate(message.schedule)
        addToMessageQueue(message.sequenceId, utcDate, message._id)
      }
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to find message record ${err}`)
    })
}

function setScheduleDate (schedule) {
  let d1 = new Date()
  if (schedule.condition === 'hours') {
    d1.setHours(d1.getHours() + Number(schedule.days))
  } else if (schedule.condition === 'minutes') {
    d1.setMinutes(d1.getMinutes() + Number(schedule.days))
  } else if (schedule.condition === 'day(s)') {
    d1.setDate(d1.getDate() + Number(schedule.days))
  }
  return new Date(d1)
}

const setSequenceTrigger = function (companyId, subscriberId, trigger) {
  SequenceDatalayer.genericFindForSequence({ companyId: companyId })
    .then(sequences => {
      if (sequences) {
        sequences.forEach(sequence => {
          if (sequence.trigger && sequence.trigger.event) {
            if ((sequence.trigger.event === trigger.event && !trigger.value) || (sequence.trigger.event === trigger.event && sequence.trigger.value === trigger.value)) {
              SequenceDatalayer.genericFindForSequenceMessages({sequenceId: sequence._id})
                .then(messages => {
                  let sequenceSubscriberPayload = {
                    sequenceId: sequence._id,
                    subscriberId: subscriberId,
                    companyId: companyId,
                    status: 'subscribed'
                  }
                  SequenceDatalayer.createForSequenceSubcriber(sequenceSubscriberPayload)
                    .then(subscriberCreated => {
                      if (messages) {
                        messages.forEach(message => {
                          let utcDate = setScheduleDate(message.schedule)
                          addToMessageQueue(sequence._id, utcDate, message._id)
                        })
                      }
                      logger.serverLog(TAG, `Subscribed to sequence successfully`)
                    })
                    .catch(err => {
                      return logger.serverLog(TAG, `ERROR saving sequence subscriber ${JSON.stringify(err)}`)
                    })
                })
                .catch(err => {
                  return logger.serverLog(TAG, `ERROR getting sequence message${JSON.stringify(err)}`)
                })
            }
          }
        })
      }
    })
    .catch(err => {
      return logger.serverLog(TAG, `ERROR getting sequence ${JSON.stringify(err)}`)
    })
}

exports.setSequenceTrigger = setSequenceTrigger
exports.addToMessageQueue = addToMessageQueue
exports.checkParentMessageTrigger = checkParentMessageTrigger
exports.setScheduleDate = setScheduleDate
