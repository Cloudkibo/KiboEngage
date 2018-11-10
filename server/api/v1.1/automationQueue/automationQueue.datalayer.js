/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const { callApi } = require('../utility')

exports.findOneAutomationQueueObject = (objectId) => {
  let query = {
    purpose: 'findOne',
    match: {_id: objectId}
  }
  return callApi(`automation_queue/query`, 'post', query, '', 'kiboengage')
}

exports.findAllAutomationQueueObjects = () => {
  let query = {
    purpose: 'findAll',
    match: {}
  }
  return callApi(`automation_queue/query`, 'post', query, '', 'kiboengage')
}

exports.findOneAutomationQueueObjectUsingQuery = (queryObject) => {
  let query = {
    purpose: 'findOne',
    match: queryObject
  }
  return callApi(`automation_queue/query`, 'post', query, '', 'kiboengage')
}

exports.findAllAutomationQueueObjectsUsingQuery = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`automation_queue/query`, 'post', query, '', 'kiboengage')
}

exports.createAutomationQueueObject = (payload) => {
  return callApi(`automation_queue`, 'post', payload, '', 'kiboengage')
}

exports.updateAutomationQueueObject = (objectId, payload) => {
  let query = {
    purpose: 'updateOne',
    match: {_id: objectId},
    updated: payload
  }
  return callApi(`automation_queue`, 'put', query, '', 'kiboengage')
}

exports.deleteAutomationQueueObject = (objectId) => {
  let query = {
    purpose: 'deleteOne',
    match: {_id: objectId}
  }
  return callApi(`automation_queue`, 'delete', query, '', 'kiboengage')
}

exports.deleteAutomationQueueObjectUsingQuery = (queryObject) => {
  let query = {
    purpose: 'deleteOne',
    match: queryObject
  }
  return callApi(`automation_queue`, 'delete', query, '', 'kiboengage')
}
