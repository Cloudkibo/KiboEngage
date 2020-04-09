const needle = require('needle')
const config = require('../../../config/environment/index')
const logger = require('../../../components/logger')
const TAG = 'api/v1.1/utility/index.js'
const { accounts } = require('../../global/constants').serverConstants

exports.callApi = (endpoint, method = 'get', body, type = accounts, token) => {
  let headers
  if (token && token !== '') {
    headers = {
      'content_type': 'application/json',
      'Authorization': token
    }
  } else {
    headers = {
      'content_type': 'application/json',
      'is_kibo_product': true
    }
  }
  let apiUrl = config.api_urls[type]
  // console.log('api_url type', type)
  // console.log('config.api_urls', config.api_urls)
  // console.log(`callApi uri ${apiUrl}/${endpoint}`)
  let options = {
    method: method.toUpperCase(),
    uri: `${apiUrl}/${endpoint}`,
    headers,
    body,
    json: true
  }
  return new Promise((resolve, reject) => {
    needle(method, options.uri, body, options)
      .then(response => {
        if (response.body.status === 'success') {
          resolve(response.body.payload)
        } else {
          reject(response.body.payload)
        }
      })
      .catch(error => {
        reject(error)
        logger.serverLog(TAG, `error in calling internal APIs ${JSON.stringify(error)}`, 'error')
      })
  })
}
