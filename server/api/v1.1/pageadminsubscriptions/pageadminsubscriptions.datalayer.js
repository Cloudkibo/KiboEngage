/*
This file will contain the functions for data layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/
const { callApi } = require('../utility')

exports.genericFind = (queryObject) => {
  let query = {
    purpose: 'findAll',
    match: queryObject
  }
  return callApi(`pageadminsubscriptions/query`, 'post', query, '', 'kiboengage')
}
