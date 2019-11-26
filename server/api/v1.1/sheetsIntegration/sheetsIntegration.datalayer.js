const { callApi } = require('../utility')

exports.index = (payload) => {
  return callApi(`integrations/query`, 'post', payload, 'accounts')
}

exports.create = (payload) => {
  return callApi(`integrations/`, 'post', payload, 'accounts')
}

exports.update = (id, body) => {
  return callApi(`integrations/update`, 'put', {query: {_id: id}, newPayload: body, options: {}}, 'accounts')
}