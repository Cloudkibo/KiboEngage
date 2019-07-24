const logger = require('../../../components/logger')
const TAG = 'api/companyprofile/company.controller.js'
const utility = require('../utility')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const helperApiCalls = require('./helperApiCalls')
const async = require('async')

exports.members = function (req, res) {
  utility.callApi(`companyprofile/members`, 'get', {}, 'accounts', req.headers.authorization)
    .then(members => {
      sendSuccessResponse(res, 200, members)
    })
    .catch(err => {
      sendErrorResponse(res, 500, `Failed to fetch members ${err}`)
    })
}
exports.getAutomatedOptions = function (req, res) {
  utility.callApi(`companyprofile/getAutomatedOptions`, 'get', {}, 'accounts', req.headers.authorization)
    .then(payload => {
      sendSuccessResponse(res, 200, payload)
    })
    .catch(err => {
      sendErrorResponse(res, 500, `Failed to fetch automated options ${err}`)
    })
}

exports.invite = function (req, res) {
  utility.callApi('companyprofile/invite', 'post', {email: req.body.email, name: req.body.name, role: req.body.role}, 'accounts', req.headers.authorization)
    .then((result) => {
      logger.serverLog(TAG, 'result from invite endpoint accounts', 'debug')
      logger.serverLog(TAG, result, 'debug')
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      logger.serverLog(TAG, 'result from invite endpoint accounts', 'debug')
      logger.serverLog(TAG, err, 'debug')
      sendErrorResponse(res, 500, err.error.payload)
    })
}

exports.updateRole = function (req, res) {
  utility.callApi('companyprofile/updateRole', 'post', {role: req.body.role, domain_email: req.body.domain_email})
    .then((result) => {
      logger.serverLog(TAG, 'result from invite endpoint accounts', 'debug')
      logger.serverLog(TAG, result, 'debug')
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      sendErrorResponse(res, 500, err.error.payload)
    })
}

exports.updateAutomatedOptions = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      utility.callApi(`companyprofile/update`, 'put', {query: {_id: companyUser.companyId}, newPayload: {automated_options: req.body.automated_options}, options: {}})
        .then(updatedProfile => {
          sendSuccessResponse(res, 200, updatedProfile)
        })
        .catch(err => {
          sendErrorResponse(res, 500, `Failed to update company profile ${err}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to company user ${JSON.stringify(error)}`)
    })
}
exports.updatePlatform = function (req, res) {
  let data = {
    companyUserCriteria: {domain_email: req.user.domain_email},
    twillioAccountSID: req.body.twilio.accountSID,
    twillioAuthToken: req.body.twilio.authToken,
    twillioPlatform: req.body.twilio.platform,
    updateCompanyProfileCriteria: {
      query: {_id: req.user.companyId},
      newPayload: {
        twilio: {
          accountSID: req.body.twilio.accountSID,
          authToken: req.body.twilio.platform
        }
      },
      options: {}
    },
    userUpdateCriteria: {
      query: {_id: req.user._id},
      newPayload: {platform: req.body.twilio.platform},
      options: {}
    }
  }
  async.series([
    helperApiCalls._getCompanyUser.bind(null, data),
    helperApiCalls._authenticateTwillioAccount.bind(null, data),
    helperApiCalls._updateCompanyProfile.bind(null, data),
    helperApiCalls._updateUser.bind(null, data),
    helperApiCalls._updateTwillioPhoneNumbers.bind(null, data)
  ], function (err) {
    if (err) {
      sendErrorResponse(res, 500, err)
    } else {
      sendSuccessResponse(res, 200, data.updatedProfile)
    }
  })
}

exports.updatePlatformWhatsApp = function (req, res) {
  let data = {
    companyUserCriteria: {domain_email: req.user.domain_email},
    twillioAccountSID: req.body.accountSID,
    twillioAuthToken: req.body.authToken,
    twillioPlatform: req.body.platform,
    updateCompanyProfileCriteria: {
      query: {_id: req.user.companyId},
      newPayload: {
        twilioWhatsApp: {
          accountSID: req.body.accountSID,
          authToken: req.body.platform,
          sandboxNumber: req.body.sandboxNumber.split(' ').join(''),
          sandboxCode: req.body.sandboxCode
        }
      },
      options: {}
    },
    userUpdateCriteria: {
      query: {_id: req.user._id},
      newPayload: {platform: req.body.platform},
      options: {}
    }
  }
  async.series([
    helperApiCalls._getCompanyUser.bind(null, data),
    helperApiCalls._authenticateTwillioAccount.bind(null, data),
    helperApiCalls._updateCompanyProfile.bind(null, data),
    helperApiCalls._updateUser.bind(null, data)
  ], function (err) {
    if (err) {
      sendErrorResponse(res, 500, err)
    } else {
      sendSuccessResponse(res, 200, data.updatedProfile)
    }
  })
}

exports.disconnect = function (req, res) {
  let data = {
    companyUserCriteria: {domain_email: req.user.domain_email},
    twillioPlatform: true,
    twillioResponse: {statusCode: 200},
    updateCompanyProfileCriteria: {
      query: {_id: req.user.companyId},
      newPayload: req.body.type === 'sms' ? {$unset: {twilio: 1}}
        : {$unset: {twilioWhatsApp: 1}},
      options: {}
    },
    userUpdateCriteria: {
      query: {_id: req.user._id},
      options: {}
    },
    body: {
      type: req.body.type
    },
    method: 'disconnect'
  }
  async.series([
    helperApiCalls._getCompanyUser.bind(null, data),
    helperApiCalls._updateCompanyProfile.bind(null, data),
    helperApiCalls._updateUser.bind(null, data)
  ], function (err) {
    if (err) {
      sendErrorResponse(res, 500, err)
    } else {
      sendSuccessResponse(res, 200, data.updatedProfile)
    }
  })
}
