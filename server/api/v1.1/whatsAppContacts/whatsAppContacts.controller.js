const logicLayer = require('./logiclayer')
const utility = require('../utility')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const phoneNumberLogicLayer = require('../phoneNumber/phoneNumber.logiclayer')
const path = require('path')
const fs = require('fs')
const async = require('async')
const csv = require('csv-parser')
const logger = require('../../../components/logger')
const TAG = 'api/whatsAppContacts/whatsAppContacts.controller.js'
const {ActionTypes} = require('../../../whatsAppMapper/constants')
const { whatsAppMapper } = require('../../../whatsAppMapper/whatsAppMapper')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      let criterias = logicLayer.getCriterias(req.body, companyuser)
      utility.callApi(`whatsAppContacts/aggregate`, 'post', criterias.countCriteria) // fetch subscribers count
        .then(count => {
          utility.callApi(`whatsAppContacts/aggregate`, 'post', criterias.fetchCriteria) // fetch subscribers
            .then(contacts => {
              var data = {
                count: count.length > 0 ? count[0].count : 0,
                contacts: contacts
              }
              sendSuccessResponse(res, 200, data)
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to fetch subscribers ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch subscriber count ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.update = function (req, res) {
  let subsriberData = {
    query: {_id: req.params.id},
    newPayload: req.body,
    options: {}
  }
  utility.callApi(`whatsAppContacts/update`, 'put', subsriberData)
    .then(updated => {
      require('./../../../config/socketio').sendMessageToClient({
        room_id: req.user.companyId,
        body: {
          action: 'Whatsapp_subscriberName_update',
          payload: {
            subscriberId: req.params.id,
            name: req.body.name
          }
        }
      })
      sendSuccessResponse(res, 200, updated)
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.update`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.getDuplicateSubscribers = function (req, res) {
  let directory = phoneNumberLogicLayer.directory(req)
  fs.rename(req.files.file.path, path.join(directory.dir, '/userfiles/', directory.serverPath), err => {
    if (err) {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.getDuplicateSubscribers`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', 'internal server error' + JSON.stringify(err))
    }
    let data = {
      body: req.body,
      companyId: req.user.companyId,
      directory: directory
    }
    _getDuplicateRecords(data)
      .then(result => {
        sendSuccessResponse(res, 200, result)
      })
  })
}
const _getDuplicateRecords = (data) => {
  return new Promise(function (resolve, reject) {
    let phoneColumn = data.body.phoneColumn
    let nameColumn = data.body.nameColumn
    let numbers = []
    fs.createReadStream(data.directory.dir + '/userfiles/' + data.directory.serverPath)
      .pipe(csv())
      .on('data', function (fileData) {
        if (fileData[`${phoneColumn}`] && fileData[`${nameColumn}`]) {
          var result = fileData[`${phoneColumn}`].replace(/[- )(]+_/g, '')
          numbers.push(result)
        }
      })
      .on('end', function () {
        fs.unlinkSync(data.directory.dir + '/userfiles/' + data.directory.serverPath)
        let query = [
          {$match: {number: {$in: numbers}, companyId: data.companyId}},
          {$group: {_id: null, count: {$sum: 1}}}
        ]
        utility.callApi(`whatsAppContacts/aggregate`, 'post', query)
          .then(results => {
            resolve(results.length > 0 ? results[0].count : 0)
          })
          .catch(error => {
            const message = error || 'Failed to fetch contacts'
            logger.serverLog(message, `${TAG}: _getDuplicateRecords`, data, {}, 'error')
            resolve(0)
          })
      })
  })
}
exports.sendMessage = function (req, res) {
  let payload = JSON.parse(req.body.payload)
  let directory = phoneNumberLogicLayer.directory(req)
  fs.rename(req.files.file.path, path.join(directory.dir, '/userfiles/', directory.serverPath), err => {
    if (err) {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.sendMessage`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', 'internal server error' + JSON.stringify(err))
    }
    let data = {
      body: req.body,
      companyId: req.user.companyId,
      user: req.user,
      directory: directory,
      payload: payload,
      whatsApp: req.user.whatsApp
    }
    async.series([
      _parseFile.bind(null, data),
      _fetchSubscribers.bind(null, data),
      _sendTemplateMessage.bind(null, data)
    ], function (err) {
      if (err) {
        const message = err || 'Failed to send template invitation'
        logger.serverLog(message, `${TAG}: exports.sendMessage`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 500, '', err)
      } else {
        sendSuccessResponse(res, 200, 'Message Sent Successfully')
      }
    })
  })
}

const _parseFile = (data, next) => {
  let phoneColumn = data.body.phoneColumn
  let nameColumn = data.body.nameColumn
  let contacts = []
  fs.createReadStream(data.directory.dir + '/userfiles/' + data.directory.serverPath)
    .pipe(csv())
    .on('data', function (fileData) {
      if (fileData[`${phoneColumn}`] && fileData[`${nameColumn}`]) {
        var result = fileData[`${phoneColumn}`].replace(/[- )(]+_/g, '')
        contacts.push({name: fileData[`${nameColumn}`], number: result})
      }
    })
    .on('end', function () {
      fs.unlinkSync(data.directory.dir + '/userfiles/' + data.directory.serverPath)
      data.contacts = contacts
      next(null, data)
    })
}
const _sendTemplateMessage = (data, next) => {
  if (data.numbers.length > 0) {
    whatsAppMapper(data.whatsApp.provider, ActionTypes.SEND_INVITATION_TEMPLATE, data)
      .then(response => {
        next(null, data)
      })
      .catch(error => {
        const message = error || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: _sendTemplateMessage`, data, {}, 'error')
        next(error)
      })
  } else {
    next(null, data)
  }
}
const _fetchSubscribers = (data, next) => {
  let numbers = []
  data.contacts.forEach((contact, index) => {
    utility.callApi(`whatsAppContacts/query`, 'post', {companyId: data.companyId, number: contact.number})
      .then(whatsAppContact => {
        whatsAppContact = whatsAppContact[0]
        if (!whatsAppContact) {
          numbers.push(contact.number)
          _saveSubscriber(data, contact)
        } else if (data.body.actionType === 'send') {
          numbers.push(contact.number)
          _saveChat(data, whatsAppContact)
          _updateSubscriber(whatsAppContact)
        }
        if (index === data.contacts.length - 1) {
          data.numbers = numbers
          next(null, data)
        }
      })
      .catch((err) => {
        const message = err || 'Internal Server Error'
        logger.serverLog(message, `${TAG}: _fetchSubscribers`, data, {}, 'error')
        next(err)
      })
  })
}

const _saveSubscriber = (data, contact) => {
  utility.callApi(`whatsAppContacts`, 'post', {
    name: contact.name,
    number: contact.number,
    companyId: data.companyId})
    .then(whatsAppContact => {
      _saveChat(data, whatsAppContact)
      _updateSubscriber(whatsAppContact)
    })
    .catch((err) => {
      const message = err || 'Failed to create subscriber'
      logger.serverLog(message, `${TAG}: _saveSubscriber`, data, {}, 'error')
    })
}

const _saveChat = (data, contact) => {
  let MessageObject = logicLayer.prepareChat(data, contact)
  utility.callApi(`whatsAppChat`, 'post', MessageObject, 'kibochat')
    .then(message => {
    })
    .catch((err) => {
      const message = err || 'Failed to save chat'
      logger.serverLog(message, `${TAG}: _saveChat`, data, {}, 'error')
    })
}

const _updateSubscriber = (contact) => {
  let subscriberData = {
    query: {_id: contact._id},
    newPayload: {
      $set: {last_activity_time: Date.now()},
      $inc: { messagesCount: 1 }
    },
    options: {}
  }
  utility.callApi(`whatsAppContacts/update`, 'put', subscriberData)
    .then(updated => {
    }).catch((err) => {
      const message = err || 'Failed to update subscriber'
      logger.serverLog(message, `${TAG}: _updateSubscriber`, contact, {}, 'error')
    })
}
