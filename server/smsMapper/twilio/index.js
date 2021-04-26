const needle = require('needle')
let config = require('../../config/environment')

exports.verifyCredentials = (body) => {
  return new Promise((resolve, reject) => {
    needle('get', `https://${body.accountSID}:${body.authToken}@api.twilio.com/2010-04-01/Accounts`)
      .then(resp => {
        if (resp.statusCode === 200) {
          resolve()
        } else {
          reject(Error('Twilio account not found. Please enter correct details'))
        }
      })
      .catch((err) => {
        reject(err)
      })
  })
}

exports.setWebhook = (body) => {
  return new Promise((resolve, reject) => {
    let accountSid = body.accountSID
    let authToken = body.authToken
    let client = require('twilio')(accountSid, authToken)
    client.incomingPhoneNumbers
      .list().then((incomingPhoneNumbers) => {
        if (incomingPhoneNumbers && incomingPhoneNumbers.length > 0) {
          const twilioNumber = incomingPhoneNumbers.filter(p => p.phoneNumber === body.businessNumber)
          if (twilioNumber.length > 0) {
            client.incomingPhoneNumbers(twilioNumber[0].sid)
              .update({
                accountSid: body.accountSID,
                smsUrl: `${config.api_urls['webhook']}/webhooks/twilio/receiveSms`
              })
              .then(result => {
                resolve()
              })
              .catch(err => {
                reject(err)
              })
          } else {
            reject(Error('Given Business number does not exist on twilio'))
          }
        } else {
          reject(Error('The twilio account doesnot have any twilio number'))
        }
      })
  })
}
exports.sendTextMessage = ({text, company, subscriber, broadcastId}) => {
  return new Promise((resolve, reject) => {
    const client = twilioClient(company)
    client.messages.create({
      body: text,
      from: company.sms.businessNumber,
      to: subscriber.number,
      statusCallback: config.api_urls.webhook + `/webhooks/twilio/trackDelivery/${broadcastId}`
    })
      .then(res => {
        resolve({status: 'success'})
      })
      .catch(err => {
        reject(err)
      })
  })
}
function twilioClient (company) {
  const accountSid = company.sms.accountSID
  const authToken = company.sms.authToken
  const client = require('twilio')(accountSid, authToken)
  return client
}

exports.createOrder = ({company, body}) => {
  return new Promise(async (resolve, reject) => {
    resolve()
  })
}

exports.fetchAvailableNumbers = ({query}) => {
  return new Promise(async (resolve, reject) => {
    resolve([])
  })
}

exports.portNumber = (body) => {
  return new Promise(async (resolve, reject) => {
    resolve()
  })
}
