const logger = require('../../../components/logger')
const TAG = 'api/sequenceMessaging/logiclayer.js'
const SequenceMessageQueueDatalayer = require('../sequenceMessageQueue/sequenceMessageQueue.datalayer')
const SequenceDatalayer = require('./sequence.datalayer')

function addToMessageQueue (sequenceId, messageId, subscriberId, companyId, scheduleDate) {
  let sequenceQueuePayload = {
    sequenceId: sequenceId,
    subscriberId: subscriberId,
    companyId: companyId,
    sequenceMessageId: messageId,
    queueScheduledTime: scheduleDate
  }
  SequenceMessageQueueDatalayer.create(sequenceQueuePayload)
    .then(result => {
    })
    .catch(err => {
      const message = err || 'Failed to insert record in message queue'
      logger.serverLog(message, `${TAG}: addToMessageQueue`, sequenceQueuePayload, {}, 'error')
    })
}

function checkParentMessageTrigger (message, subscriberId, companyId) {
  SequenceDatalayer.genericFindForSequenceMessages({_id: message.trigger.value})
    .then(foundMessage => {
      if (foundMessage.trigger.event === 'none') {
        let utcDate = setScheduleDate(message.schedule)
        addToMessageQueue(message.sequenceId, message._id, subscriberId, companyId, utcDate)
      }
    })
    .catch(err => {
      const message = err || 'Failed to find message record'
      logger.serverLog(message, `${TAG}: checkParentMessageTrigger`, message, {}, 'error')
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
                    })
                    .catch(err => {
                      const message = err || 'Error saving sequence subscriber'
                      logger.serverLog(message, `${TAG}: setSequenceTrigger`, {companyId, subscriberId, trigger}, {}, 'error')
                    })
                })
                .catch(err => {
                  const message = err || 'Error getting sequence message'
                  logger.serverLog(message, `${TAG}: setSequenceTrigger`, {companyId, subscriberId, trigger}, {}, 'error')
                })
            }
          }
        })
      }
    })
    .catch(err => {
      const message = err || 'Error getting sequence'
      logger.serverLog(message, `${TAG}: setSequenceTrigger`, {companyId, subscriberId, trigger}, {}, 'error')
    })
}

exports.setSequenceTrigger = setSequenceTrigger
exports.addToMessageQueue = addToMessageQueue
exports.checkParentMessageTrigger = checkParentMessageTrigger
exports.setScheduleDate = setScheduleDate
