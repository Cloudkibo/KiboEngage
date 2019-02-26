/**
 * Created by sojharo on 25/09/2017.
 */
const logger = require('../../../components/logger')
const TAG = 'api/operational_dashboard/operational.controller.js'
const request = require('request-promise')
const config = require('../../../config/environment/index')

/*
Endpoint: /api/v1/UserwiseData
Type: Get
Responds: Array
Structure: TotalUserwiseAnalytics
Endpoint: /api/v1/UserwiseData/OneUserAnalytics
Type: Post
Body: companyId
Responds: Array
Structure: TotalUserwiseAnalytics
Endpoint: /api/v1/UserwiseData/AggregateDatewise
Type: Post
Body: startDate
Responds: Array
Structure: UserwiseAggregate
Endpoint: /api/v1/UserwiseData/OneUserAggregateDatewise
Type: Post
Body: startDate, companyId
Responds: Array
Structure: UserwiseAggregate
*/

exports.index = (req, res) => {
  const options = {
    uri: config.kibodashdomain + '/api/v1/UserwiseData',
    json: true // Automatically parses the JSON string in the response
  }
  request(options)
    .then((result) => {
      return res.status(200).json({status: 'success', payload: result.payload})
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`)
      return res.status(500).json({status: 'failed', description: err})
    })
}

exports.ranged = (req, res) => {
  const options = {
    method: 'POST',
    uri: config.kibodashdomain + '/api/v1/UserwiseData/AggregateDatewise',
    body: {
      startDate: req.body.startDate
    },
    json: true // Automatically parses the JSON string in the response
  }
  request(options)
    .then((result) => {
      return res.status(200).json({status: 'success', payload: result.payload})
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`)
      return res.status(500).json({status: 'failed', description: err})
    })
}

exports.oneUser = (req, res) => {
  const options = {
    method: 'POST',
    uri: config.kibodashdomain + '/api/v1/UserwiseData/OneUserAnalytics',
    body: {
      companyId: req.body.companyId
    },
    json: true // Automatically parses the JSON string in the response
  }
  request(options)
    .then((result) => {
      return res.status(200).json({status: 'success', payload: result.payload})
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`)
      return res.status(500).json({status: 'failed', description: err})
    })
}

exports.oneUserRanged = (req, res) => {
  const options = {
    method: 'POST',
    uri: config.kibodashdomain + '/api/v1/UserwiseData/OneUserAggregateDatewise',
    body: {
      startDate: req.body.startDate,
      companyId: req.body.companyId
    },
    json: true // Automatically parses the JSON string in the response
  }
  request(options)
    .then((result) => {
      return res.status(200).json({status: 'success', payload: result.payload})
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`)
      return res.status(500).json({status: 'failed', description: err})
    })
}
