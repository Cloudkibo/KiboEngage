const { callApi } = require('../utility')
const needle = require('needle')
const config = require('../../../config/environment/index')
const logicLayer = require('./company.logiclayer.js')

exports._getCompanyUser = (data, next) => {
  callApi(`companyUser/query`, 'post', data.companyUserCriteria) // fetch company user
    .then(companyUser => {
      if (!companyUser) {
        next('The user account does not belong to any company. Please contact support')
      } else {
        data.companyUser = companyUser
        if (data.method === 'disconnect') {
          let userUpdated = logicLayer.getPlatform(companyUser, data.body)
          data.userUpdateCriteria.newPayload = userUpdated
        }
        next()
      }
    })
    .catch(err => next(err))
}

exports._authenticateTwillioAccount = (data, next) => {
  needle.get(`https://${data.twillioAccountSID}:${data.twillioAuthToken}@api.twilio.com/2010-04-01/Accounts`,
    (err, resp) => {
      if (err) {
        next('unable to authenticate twilio account')
      } else {
        data.twillioResponse = resp
        next()
      }
    })
}

exports._updateCompanyProfile = (data, next) => {
  if (data.twillioResponse.statusCode === 200) {
    callApi(`companyprofile/update`, 'put', data.updateCompanyProfileCriteria)
      .then(updatedProfile => {
        data.updatedProfile = updatedProfile
        next()
      })
      .catch(err => next(err))
  } else {
    next('Twilio account not found. Please enter correct details')
  }
}

exports._updateUser = (data, next) => {
  if (data.twillioResponse.statusCode === 200 && data.twillioPlatform) {
    callApi('user/update', 'post', data.userUpdateCriteria)
      .then(updated => {
        next()
      })
      .catch(err => next(err))
  } else {
    next()
  }
}

exports._updateTwillioPhoneNumbers = (data, next) => {
  if (data.twillioResponse.statusCode === 200) {
    let client = require('twilio')(data.twillioAccountSID, data.twillioAuthToken)
    client.incomingPhoneNumbers
      .list().then((incomingPhoneNumbers) => {
        for (let i = 0; i < incomingPhoneNumbers.length; i++) {
          client.incomingPhoneNumbers(incomingPhoneNumbers[i].sid)
            .update({
              accountSid: data.twillioAccountSID,
              smsUrl: `${config.api_urls['webhook']}/webhooks/twilio/receiveSms`
            })
            .then(result => {
            })
            .catch(err => next(err))
        }
        next()
      })
  } else {
    next('Twilio account not found. Please enter correct details')
  }
}
