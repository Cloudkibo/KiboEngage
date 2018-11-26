const requestPromise = require('request-promise')
const config = require('../../../config/environment/index')
const util = require('util')
const TAG = 'api/v1/utility/index.js'
const logger = require('../../../components/logger')

exports.callApi = (endpoint, method = 'get', body, token, type = 'accounts') => {
  let headers
  if (token) {
    headers = {
      'content-type': 'application/json',
      'Authorization': token
    }
  } else {
    headers = {
      'content-type': 'application/json',
      'is_kibo_product': true
    }
  }
  let apiUrl = config.ACCOUNTS_URL
  if (type === 'chat') {
    apiUrl = config.CHAT_URL
  } else if (type === 'webhook') {
    apiUrl = config.WEBHOOKS_URL
  }
  let options = {
    method: method.toUpperCase(),
    uri: `${apiUrl}/${endpoint}`,
    headers,
    body,
    json: true
  }
  console.log('in callapi', JSON.stringify(body))
  // logger.serverLog(TAG, `requestPromise body ${util.inspect(body)}`)
  logger.serverLog(TAG, `requestPromise body ${util.inspect(body)}`)
  return requestPromise(options).then(response => {
    logger.serverLog(TAG, `response from accounts ${util.inspect(response)}`)
    return new Promise((resolve, reject) => {
      if (response.status === 'success') {
        resolve(response.payload)
      } else {
        reject(response.payload)
      }
    })
  })
}
