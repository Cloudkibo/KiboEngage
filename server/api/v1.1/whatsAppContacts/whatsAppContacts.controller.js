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
const { flockSendApiCaller } = require('../../global/flockSendApiCaller')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }) // fetch company user
    .then(companyuser => {
      let criterias = logicLayer.getCriterias(req.body, companyuser)
      utility.callApi(`whatsAppContacts/aggregate`, 'post', criterias.countCriteria) // fetch subscribers count
        .then(count => {
          utility.callApi(`whatsAppContacts/aggregate`, 'post', criterias.fetchCriteria) // fetch subscribers
            .then(contacts => {
              var data = {
                count: count[0].count,
                contacts: contacts
              }
              sendSuccessResponse(res, 200, data)
            })
            .catch(error => {
              sendErrorResponse(res, 500, `Failed to fetch subscribers ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch subscriber count ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
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
      sendSuccessResponse(res, 200, updated)
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.getDuplicateSubscribers = function (req, res) {
  let directory = phoneNumberLogicLayer.directory(req)
  fs.rename(req.files.file.path, path.join(directory.dir, '/userfiles/', directory.serverPath), err => {
    if (err) {
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
            resolve(0)
            logger.serverLog(TAG, `Failed to fetch contacts ${JSON.stringify(error)}`, 'error')
          })
      })
  })
}
exports.sendMessage = function (req, res) {
  let payload = JSON.parse(req.body.payload)
  let directory = phoneNumberLogicLayer.directory(req)
  fs.rename(req.files.file.path, path.join(directory.dir, '/userfiles/', directory.serverPath), err => {
    if (err) {
      sendErrorResponse(res, 500, '', 'internal server error' + JSON.stringify(err))
    }
    let data = {
      body: req.body,
      companyId: req.user.companyId,
      user: req.user,
      directory: directory,
      payload: payload
    }
    async.series([
      _getCompanyProfile.bind(null, data),
      _parseFile.bind(null, data),
      _fetchSubscribers.bind(null, data),
      _sendTemplateMessage.bind(null, data)
    ], function (err) {
      if (err) {
        logger.serverLog(TAG, `Failed to create autoposting. ${JSON.stringify(err)}`)
        sendErrorResponse(res, 500, '', err)
      } else {
        sendSuccessResponse(res, 200, 'Message Sent Successfully')
      }
    })
  })
}
const _getCompanyProfile = (data, next) => {
  utility.callApi('companyprofile/query', 'post', {_id: data.companyId})
    .then(company => {
      data.accessToken = company.flockSendWhatsApp.accessToken
      data.senderNumber = company.flockSendWhatsApp.number
      next(null, data)
    })
    .catch((err) => {
      next(err)
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
    let MessageObject = logicLayer.prepareFlockSendPayload(data)
    flockSendApiCaller('hsm', 'post', MessageObject)
      .then(response => {
        logger.serverLog(TAG, `response from flockSendApiCaller ${response.body}`, 'error')
        let parsed = JSON.parse(response.body)
        if (parsed.code !== 200) {
          logger.serverLog(TAG, `error at sending message ${parsed.message}`, 'error')
          next(parsed.message)
        } else {
          next(null, data)
        }
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
          numbers.push({phone: contact.number})
          _saveSubscriber(data, contact)
        } else if (data.body.actionType === 'send') {
          numbers.push({phone: contact.number})
          _saveChat(data, whatsAppContact)
          _updateSubscriber(whatsAppContact)
        }
        if (index === data.contacts.length - 1) {
          data.numbers = numbers
          next(null, data)
        }
      })
      .catch((err) => {
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
      logger.serverLog(TAG, `Failed to create subscriber ${err}`, 'error')
    })
}

const _saveChat = (data, contact) => {
  let MessageObject = logicLayer.prepareChat(data, contact)
  utility.callApi(`whatsAppChat`, 'post', MessageObject, 'kibochat')
    .then(message => {
    })
    .catch((err) => {
      logger.serverLog(TAG, `Failed to save chat ${err}`, 'error')
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
      logger.serverLog(TAG, `Failed to update subscriber ${err}`, 'error')
    })
}
// const _removeDuplicates = (data, next) => {
//   const unique = data.contacts.map(e => e.number)
//     .map((e, i, final) => final.indexOf(e) === i && i)
//     .filter((e) => data.contacts[e]).map(e => data.contacts[e])
// }
