/**
 * Created by sojharo on 24/11/2017.
 */

// eslint-disable-next-line no-unused-vars
const logger = require('../../../components/logger')
// eslint-disable-next-line no-unused-vars
const TAG = 'api/api_ngp/api_ngp.controller.js'

const ApiNGP = require('./api_ngp.model')
const _ = require('lodash')
const utility = require('../utility')

exports.index = function (req, res) {
  if (!_.has(req.body, 'company_id')) {
    return res.status(400)
      .json({status: 'failed', description: 'Parameters are missing. company_id is required'})
  }

  ApiNGP.findOne({company_id: req.body.company_id}, (err, settings) => {
    if (err) {
      return res.status(500)
        .json({status: 'failed', description: 'API query failed'})
    }
    if (!settings) {
      return res.status(404)
        .json({
          status: 'failed',
          description: 'API NGP not initialized or invalid user. Call enable API to initialize them.'
        })
    }
    res.status(200).json({
      status: 'success',
      payload: settings
    })
  })
}

exports.enable = function (req, res) {
  if (!_.has(req.body, 'company_id')) {
    return res.status(400)
      .json({status: 'failed', description: 'Parameters are missing. company_id is required'})
  }
  utility.callApi(`api_ngp/query`, 'post', { company_id: req.body.company_id })
    .then(savedSettings => {
      res.status(201).json({
        status: 'success',
        payload: savedSettings
      })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', description: `Failed to enable api ${JSON.stringify(error)}`})
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
    return res.status(400)
      .json({status: 'failed', description: 'Parameters are missing. company_id is required'})
  }

  ApiNGP.findOne({company_id: req.body.company_id}, (err, settings) => {
    if (err) {
      return res.status(500)
        .json({status: 'failed', description: 'API query failed'})
    }
    if (!settings) {
      return res.status(404)
        .json({
          status: 'failed',
          description: 'API settings not initialized. Call enable API to initialize them.'
        })
    }
    settings.enabled = false
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
  })
}

exports.save = function (req, res) {
  logger.serverLog(TAG, `incoming body ${JSON.stringify(req.body)}`, 'debug')

  if (!_.has(req.body, 'company_id')) {
    return res.status(400)
      .json({status: 'failed', description: 'Parameters are missing. company_id is required'})
  }

  if (!_.has(req.body, 'app_id')) {
    return res.status(400)
      .json({status: 'failed', description: 'Parameters are missing. app_id is required'})
  }

  if (!_.has(req.body, 'app_secret')) {
    return res.status(400)
      .json({status: 'failed', description: 'Parameters are missing. app_secret is required'})
  }

  if (req.body.app_id === '') {
    return res.status(400)
      .json({status: 'failed', description: 'Parameters are wrong. app_id or app name should not be empty'})
  }

  if (req.body.app_secret === '') {
    return res.status(400)
      .json({status: 'failed', description: 'Parameters are wrong. app_secret or app key should not be empty'})
  }

  ApiNGP.findOne({company_id: req.body.company_id}, (err, settings) => {
    if (err) {
      return res.status(500)
        .json({status: 'failed', description: 'API query failed'})
    }
    if (!settings) {
      return res.status(404)
        .json({
          status: 'failed',
          description: 'API settings not initialized or user not found. Call enable API to initialize them.'
        })
    }
    settings.app_id = req.body.app_id
    settings.app_secret = req.body.app_secret
    settings.save((err, savedSettings) => {
      if (err) {
        return res.status(500)
          .json({status: 'failed', description: 'API save failed'})
      }
      res.status(200).json({
        status: 'success',
        payload: savedSettings
      })
    })
  })
}
