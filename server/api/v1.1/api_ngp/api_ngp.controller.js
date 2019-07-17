/**
 * Created by sojharo on 24/11/2017.
 */

// eslint-disable-next-line no-unused-vars
const logger = require('../../../components/logger')
// eslint-disable-next-line no-unused-vars
const TAG = 'api/api_ngp/api_ngp.controller.js'
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const ApiNGP = require('./api_ngp.model')
const _ = require('lodash')
const utility = require('../utility')

exports.index = function (req, res) {
  if (!_.has(req.body, 'company_id')) {
    sendErrorResponse(res, 400, '', 'Parameters are missing. company_id is required')
  }

  ApiNGP.findOne({company_id: req.body.company_id}, (err, settings) => {
    if (err) {
      sendErrorResponse(res, 500, '', 'API query failed')
    }
    if (!settings) {
      sendErrorResponse(res, 404, '', 'API NGP not initialized or invalid user. Call enable API to initialize them.')
    }
    sendSuccessResponse(res, 200, settings)
  })
}

exports.enable = function (req, res) {
  if (!_.has(req.body, 'company_id')) {
    sendErrorResponse(res, 400, '', 'Parameters are missing. company_id is required')
  }
  utility.callApi(`api_ngp/query`, 'post', { company_id: req.body.company_id })
    .then(savedSettings => {
      sendSuccessResponse(res, 201, savedSettings)
    })
    .catch(error => {
      sendErrorResponse(res, 500, '', `Failed to enable api ${JSON.stringify(error)}`)
    })
/*  if (!_.has(req.body, 'company_id')) {
    return res.status(400)
    .json({status: 'failed', description: 'Parameters are missing. company_id is required'})
  }

  ApiNGP.findOne({company_id: req.body.company_id}, (err, settings) => {
    if (err) {
      return res.status(500)
        .json({status: 'failed', description: 'API query failed'})
    }
    if (!settings) {
      let uid = 'My NGP App Id'
      let pwd = 'My NGP Secret Key'
      let newSettings = new ApiNGP({
        company_id: req.body.company_id,
        enabled: true,
        app_id: uid,
        app_secret: pwd
      })
      newSettings.save((err, savedSettings) => {
        if (err) {
          return res.status(500)
            .json({status: 'failed', description: 'API save failed'})
        }
        res.status(201).json({
          status: 'success',
          payload: savedSettings
        })
      })
    } else {
      settings.enabled = true
      settings.save((err, savedSettings) => {
        if (err) {
          return res.status(500)
            .json({status: 'failed', description: 'API save failed'})
        }
        res.status(201).json({
          status: 'success',
          payload: savedSettings
        })
      })
    }
  }) */
}

exports.disable = function (req, res) {
  if (!_.has(req.body, 'company_id')) {
    sendErrorResponse(res, 400, '', 'Parameters are missing. company_id is required')
  }

  ApiNGP.findOne({company_id: req.body.company_id}, (err, settings) => {
    if (err) {
      sendErrorResponse(res, 500, '', 'API query failed')
    }
    if (!settings) {
      sendErrorResponse(res, 404, '', 'API settings not initialized. Call enable API to initialize them.')
    }
    settings.enabled = false
    settings.save((err, savedSettings) => {
      if (err) {
        sendErrorResponse(res, 500, '', 'API save failed')
      }
      sendSuccessResponse(res, 200, savedSettings)
    })
  })
}

exports.save = function (req, res) {
  logger.serverLog(TAG, `incoming body ${JSON.stringify(req.body)}`, 'debug')

  if (!_.has(req.body, 'company_id')) {
    sendErrorResponse(res, 400, '', 'Parameters are missing. company_id is required')
  }

  if (!_.has(req.body, 'app_id')) {
    sendErrorResponse(res, 400, '', 'Parameters are missing. app_id is required')
  }

  if (!_.has(req.body, 'app_secret')) {
    sendErrorResponse(res, 400, '', 'Parameters are missing. app_secret is required')
  }

  if (req.body.app_id === '') {
    sendErrorResponse(res, 400, '', 'Parameters are missing. app_id or app name should not be empty.')
  }

  if (req.body.app_secret === '') {
    sendErrorResponse(res, 400, '', 'Parameters are missing. app_secret or app key should not be empty.')
  }

  ApiNGP.findOne({company_id: req.body.company_id}, (err, settings) => {
    if (err) {
      sendErrorResponse(res, 500, '', 'API query failed')
    }
    if (!settings) {
      sendErrorResponse(res, 404, '', 'API settings not initialized or user not found. Call enable API to initialize them.')
    }
    settings.app_id = req.body.app_id
    settings.app_secret = req.body.app_secret
    settings.save((err, savedSettings) => {
      if (err) {
        sendErrorResponse(res, 500, '', 'API save failed')
      }
      sendSuccessResponse(res, 200, savedSettings)
    })
  })
}
