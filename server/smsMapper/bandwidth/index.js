const numbers = require('@bandwidth/numbers')
const { callApi } = require('../../api/v1.1/utility')

exports.verifyCredentials = (body) => {
  return new Promise((resolve, reject) => {
    resolve()
  })
}

exports.setWebhook = (body) => {
  return new Promise((resolve, reject) => {
    resolve()
  })
}

exports.getCompany = (body) => {
  return new Promise((resolve, reject) => {
    callApi(`companyprofile/query`, 'post', {'sms.accountId': body.AccountSid})
      .then(company => { resolve(company) })
      .catch(err => { reject(err) })
  })
}

exports.fetchAvailableNumbers = ({company, query}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const client = new numbers.Client(company.sms.accountId, company.sms.username, company.sms.password)
      const availableNumbers = await numbers.AvailableNumbers.listAsync(client, query)
      if (availableNumbers.telephoneNumberList && availableNumbers.telephoneNumberList.telephoneNumber) {
        resolve(availableNumbers.telephoneNumberList.telephoneNumber)
      } else {
        resolve([])
      }
    } catch (err) {
      reject(err)
    }
  })
}

exports.createOrder = ({company, body}) => {
  return new Promise(async (resolve, reject) => {
    numbers.Client.globalOptions.accountId = company.sms.accountId
    numbers.Client.globalOptions.userName = company.sms.username
    numbers.Client.globalOptions.password = company.sms.password
    let order = {
      name: company._id,
      siteId: body.siteId,
      existingTelephoneNumberOrderType: {
        telephoneNumberList: [body.number]
      }
    }
    numbers.Order.create(order, function (err, res) {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}
