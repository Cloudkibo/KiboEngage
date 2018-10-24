const requestPromise = require('request-promise')
<<<<<<< HEAD
const config = require('../config/environment/index')
=======
const config = require('../../../config/environment/index')
>>>>>>> 5d533c9814bdd64a9ab306bcc254f4bfeabb779e

exports.callApi = (endpoint, method = 'get', body, token, type = 'accounts') => {
  let headers = {
    'content-type': 'application/json',
    'Authorization': token
  }
  let apiUrl = config.ACCOUNT_URL
  if (type === 'chat') {
    apiUrl = config.CHAT_URL
  }
  let options = {
    method: method.toUpperCase(),
    uri: `${apiUrl}/${endpoint}`,
    headers,
    body,
    json: true
  }
  // logger.serverLog(TAG, `requestPromise body ${util.inspect(headers)}`)
  return requestPromise(options).then(response => {
    // logger.serverLog(TAG, `response from accounts ${util.inspect(response)}`)
    return new Promise((resolve, reject) => {
      if (response.status === 'success') {
        resolve(response.payload)
      } else {
        reject(response.payload)
      }
    })
  })
}
