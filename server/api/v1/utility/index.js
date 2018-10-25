const requestPromise = require('request-promise')
const config = require('../../../config/environment/index')
const util = require('util')
const TAG = 'api/v1/utility/index.js'
const logger = require('../../../components/logger')

exports.callApi = (endpoint, method = 'get', body, token, type = 'accounts') => {
  console.log('in callapi', config.ACCOUNTS_URL)
  let headers = {
    'content-type': 'application/json',
    'Authorization': token
  }
  let apiUrl = config.ACCOUNTS_URL
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
  console.log('in callapi', options)
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
