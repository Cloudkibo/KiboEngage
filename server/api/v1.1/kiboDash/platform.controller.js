/**
 * Created by sojharo on 25/09/2017.
 */
const logger = require('../../../components/logger')
const TAG = 'api/operational_dashboard/operational.controller.js'
const request = require('request-promise')
const config = require('../../../config/environment/index')
/*
Endpoint: /api/v1/PlatformwiseData
Type: Get
Responds: Array
Structure: TotalPlatformwiseAnalytics

Endpoint: /api/v1/PlatformwiseData/AggregateDatewise
Type: Post
Body: startDate
Responds: Array
Structure: PlatformwiseAggregate
*/

exports.index = (req, res) => {
  const options = {
    uri: config.kibodashdomain + '/api/v1/PlatformwiseData',
    json: true // Automatically parses the JSON string in the response
  }
  request(options)
    .then((result) => {
      if (result.status === 'success' && result.payload.length === 1) {
        // The array length will always be 1
        return res.status(200).json({status: 'success', payload: result.payload[0]})
      } else {
        return res.status(500).json({status: 'failed', description: 'Unable to fetch data from KiboDash'})
      }
    })
    .catch((err) => {
      logger.serverLog(TAG, `Error in fetching data from KiboDash ${JSON.stringify(err)}`)
      return res.status(500).json({status: 'failed', description: err})
    })
}

exports.ranged = (req, res) => {
  const options = {
    method: 'POST',
    uri: config.kibodashdomain + '/api/v1/PlatformwiseData/AggregateDatewise',
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
