const fetch = require('isomorphic-fetch')
exports.callApi = (id, method = 'get', body) => {
  let headers = {
    'content-type': 'application/json',
    'is_kibo_product': true
  }
  let fetchUrl = `https://saccounts.cloudkibo.com/api/v1/files/download/${id}`
  return fetch(fetchUrl, {
    headers,
    method,
    body: JSON.stringify(body)
  }).then(response => {
    console.log('response', response)
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
