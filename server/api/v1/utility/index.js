const fetch = require('isomorphic-fetch')
const config = require('../config/environment/index')
exports.callApi = (endpoint, method = 'get', body, type='accounts') => {
 console.log('endpoint', endpoint)
 let headers = {
   'content-type': 'application/json'
 }
 let apiUrl = config.API_URL
 if (type === 'accounts') {
   apiUrl = config.ACCOUNT_URL
 } else if (type === 'chat') {
   apiUrl = config.CHAT_URL
 }
 return fetch(`${apiUrl}/${endpoint}`, {
   headers,
   method,
   body: JSON.stringify(body)
 }).then(response => {
   return response
 }).then(response => response.json().then(json => ({ json, response })))
   .then(({ json, response }) => {
     if (!response.ok) {
       return Promise.reject(json)
     }
     return json
   })
   .then(
     response => response,
     error => error
   )
}
