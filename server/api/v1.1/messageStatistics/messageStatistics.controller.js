/**
 * Created by sojharo on 24/11/2017.
 */

// eslint-disable-next-line no-unused-vars
const logger = require('../../../components/logger')
// eslint-disable-next-line no-unused-vars
const TAG = 'api/messageStatistics/messageStatistics.controller.js'
const { sendErrorResponse } = require('../../global/response')
const { getRecords } = require('./../../global/messageStatistics')
const { parse } = require('json2csv')

exports.index = function (req, res) {
  let name = req.params.name || 'broadcast'
  getRecords(name, (err, data) => {
    if (err) {
      const message = err || 'Error from Message Statistics on getRecords'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      return sendErrorResponse(res, '500', '', JSON.stringify(err))
    }
    var info = data
    var keys = []
    var val = info[0]
    // fetching json keys and storing in array
    for (var k in val) {
      var subKey = k
      keys.push(subKey)
    }
    const opts = { keys }
    try {
      const csv = parse(info, opts)
      res.send(csv)
    } catch (err) {
      const message = err || 'Error from Message Statistics on getRecords'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, '500', '', JSON.stringify(err))
    }
  })
}
