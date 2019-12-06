const TAG = 'api/global/externalIntegrations.js'
const logger = require('../../components/logger')
const { callApi } = require('./../v1.1/utility')

let kiboPushColumns = [
  {fieldName: 'firstName', title: 'First Name'},
  {fieldName: 'lastName', title: 'Last Name'},
  {fieldName: 'fullName', title: 'Full Name'},
  {fieldName: 'locale', title: 'Locale'},
  {fieldName: 'timezone', title: 'Timezone'},
  {fieldName: 'email', title: 'Email'},
  {fieldName: 'gender', title: 'Gender'},
  {fieldName: 'profilePic', title: 'Profile Pic'},
  {fieldName: 'phoneNumber', title: 'Phone Number'},
  {fieldName: 'isSubscribed', title: 'Subscribed'},
  {fieldName: 'last_activity_time', title: 'Last Interaction'},
  {fieldName: 'lastMessagedAt', title: 'Last User Interaction'},
  {fieldName: 'datetime', title: 'Subcription Date'}
]

exports.populateKiboPushColumns = () => {
  return kiboPushColumns
}

exports.populateCustomFieldColumns = (dataToSend, customFields) => {
  return new Promise(function (resolve, reject) {
    if (customFields && customFields.length > 0) {
      for (let i = 0; i < customFields.length; i++) {
        dataToSend.customFieldColumns.push({customFieldId: customFields[i]._id, title: customFields[i].name})
        if (i === customFields.length - 1) {
          resolve(dataToSend)
        }
      }
    } else {
      resolve(dataToSend)
    }
  })
}

// Getting look up value from system subscriber fields
exports.getLookUpValue = (lookUpValue, subscriber) => {
  return new Promise(function (resolve, reject) {
    if (lookUpValue.match(/^[0-9a-fA-F]{24}$/)) {
      callApi(
        'custom_field_subscribers/query',
        'post',
        {
          purpose: 'findOne',
          match: { customFieldId: lookUpValue, subscriberId: subscriber._id }
        }
      )
        .then(customFieldSubscriber => {
          if (customFieldSubscriber) {
            resolve(customFieldSubscriber.value)
          } else {
            resolve('')
          }
        })
        .catch((err) => {
          logger.serverLog(TAG, `Failed to fetch custom field subscriber ${JSON.stringify(err)}`, 'error')
          resolve('')
        })
    } else {
      if (subscriber[lookUpValue]) {
        lookUpValue = subscriber[lookUpValue]
        resolve(lookUpValue)
      } else {
        resolve('')
      }
    }
  })
}

exports.getDataForSubscriberValues = (data, callback) => {
  const { index, item, subscriber, mapping } = data
  if (item.kiboPushColumn) {
    if (subscriber[item.kiboPushColumn]) {
      mapping[index]['value'] = subscriber[item.kiboPushColumn]
      callback()
    } else {
      mapping[index]['value'] = ''
      callback()
    }
  } else if (item.customFieldColumn) {
    callApi(
      'custom_field_subscribers/query',
      'post',
      {
        purpose: 'findOne',
        match: { customFieldId: item.customFieldColumn, subscriberId: subscriber._id }
      }
    )
      .then(customFieldSubscriber => {
        if (customFieldSubscriber) {
          mapping[index]['value'] = customFieldSubscriber.value
          callback()
        } else {
          mapping[index]['value'] = ''
          callback()
        }
      })
      .catch(err => {
        logger.serverLog(TAG, `Failed to fetch custom field subscriber ${JSON.stringify(err)}`, 'error')
        callback(err)
      })
  } else {
    callback()
  }
}
