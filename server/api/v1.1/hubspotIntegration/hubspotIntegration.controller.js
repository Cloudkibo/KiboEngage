/**
 * Created by sojharo on 27/07/2017.
 */
const logger = require('../../../components/logger')
const TAG = 'api/hubspotIntegration/hubspotIntegration.controller.js'
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const dataLayer = require('./hubspotIntegration.datalayer')
const config = require('../../../config/environment')
const request = require('request')
const async = require('async')
const {callApi} = require('../utility')
const {
  populateKiboPushColumns,
  populateCustomFieldColumns
} = require('./../../global/externalIntegrations')
const {defaultFieldcolumn} = require('./hubspotDefaultFields')
const { updateCompanyUsage } = require('../../global/billingPricing')

exports.auth = function (req, res) {
  // Build the auth URL
  const authUrl =
  'https://app.hubspot.com/oauth/authorize' +
  `?client_id=${encodeURIComponent(config.hubspot.client_id)}` +
  `&scope=${encodeURIComponent(config.hubspot.scopes)}` +
  `&redirect_uri=${encodeURIComponent(config.hubspot.callbackURL)}`

  // Redirect the user
  res.redirect(authUrl)
}

exports.callback = function (req, res) {
  let code = req.query.code

  const formData = {
    grant_type: 'authorization_code',
    client_id: config.hubspot.client_id,
    client_secret: config.hubspot.client_secret,
    redirect_uri: config.hubspot.callbackURL,
    code
  }

  returnAuthToken(formData)
    .then(tokens => {
      let userId = req.cookies.userid
      dataLayer.fetchUserCompany(userId)
        .then(companyUser => {
          if (companyUser) {
            let companyId = companyUser.companyId
            dataLayer.index({ companyId, integrationName: 'Hubspot' })
              .then(integrations => {
                if (integrations.length > 0) {
                  let newPayload = {
                    companyId: integrations[0].companyId,
                    userId: integrations[0].userId,
                    integrationName: integrations[0].integrationName,
                    integrationToken: tokens.access_token,
                    integrationPayload: tokens,
                    enabled: true
                  }
                  dataLayer.update(integrations[0]._id, newPayload)
                    .then(updated => {
                      res.redirect('/successMessage')
                    })
                    .catch(err => {
                      const message = err || 'Error in Integrations Hubspot on update callback'
                      logger.serverLog(message, `${TAG}: exports.callback`, req.body, {user: req.user}, 'error')
                      res.redirect('/ErrorMessage')
                      res.status(500).send('Internal Error Occurred.')
                    })
                } else {
                  let payload = {
                    companyId,
                    userId,
                    integrationName: 'Hubspot',
                    integrationToken: tokens.access_token,
                    integrationPayload: tokens,
                    enabled: true
                  }
                  dataLayer.create(payload)
                    .then(created => {
                      updateCompanyUsage(companyId, 'external_integrations', 1)
                      res.redirect('/successMessage')
                    })
                    .catch(err => {
                      const message = err || 'Error in Integrations Hubspot on create callback'
                      logger.serverLog(message, `${TAG}: exports.callback`, req.body, {user: req.user}, 'error')
                      res.redirect('/ErrorMessage')
                      res.status(500).send('Internal Error Occurred.')
                    })
                }
              })
              .catch(err => {
                const message = err || 'Error in Integrations Hubspot on fetch callback'
                logger.serverLog(message, `${TAG}: exports.callback`, req.body, {user: req.user}, 'error')
                res.redirect('/ErrorMessage')
                res.status(500).send('Internal Error Occurred.')
              })
          } else {
            res.redirect('/ErrorMessage')
            res.status(500).send('Internal Error Occurred. Invalid user')
          }
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.callback`, req.body, {user: req.user}, 'error')
      res.redirect('/ErrorMessage')
      sendErrorResponse(res, 500, err, 'Internal Server Error occurred. Please contact admin.')
    })
}

exports.getForms = function (req, res) {
  dataLayer.index({
    companyId: req.user.companyId,
    integrationName: 'Hubspot'
  })
    .then(function (integrations) {
      if (integrations.length > 0) {
        let newTokens
        refreshAuthToken(integrations[0].integrationPayload.refresh_token)
          .then(tokens => {
            newTokens = tokens
            return saveNewTokens(integrations[0], tokens)
          })
          .then(updated => {
            return callHubspotApi('https://api.hubapi.com/forms/v2/forms', 'get', null, newTokens.access_token)
          })
          .then(forms => {
            if (forms.length === 0) {
              sendSuccessResponse(res, 200, forms, 'Zero forms found')
            } else {
              sendSuccessResponse(res, 200, forms, 'Forms of connected Hubspot account')
            }
          })
          .catch(err => {
            const message = err || 'Internal Server Error'
            logger.serverLog(message, `${TAG}: exports.getForms`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 500, err, 'Internal Server Error occurred. Please contact admin.')
          })
      } else {
        sendErrorResponse(res, 404, null, 'No integrations defined. Please enabled from settings.')
      }
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.getForms`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err, 'Internal Server Error occurred. Please contact admin.')
    })
}

exports.fetchHubspotDefaultColumns = function (req, res) {
  let dataToSend = {
    kiboPushColumns: populateKiboPushColumns(),
    customFieldColumns: [],
    hubSpotColumns: defaultFieldcolumn.hubSpotColumns
    // HubspotMappingColumns: defaultFieldcolumn.HubspotMappingColumns
  }
  callApi('custom_fields/query', 'post', { purpose: 'findAll', match: { $or: [{companyId: req.user.companyId}, {default: true}] } })
    .then(customFields => {
      populateCustomFieldColumns(dataToSend, customFields)
        .then(dataToSend => {
          sendSuccessResponse(res, 200, dataToSend)
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.fetchHubspotDefaultColumns`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, err, `failed to update custom fields ${err}`)
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.fetchHubspotDefaultColumns`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err, `failed to fetch custom fields ${err}`)
    })
}

exports.fetchColumns = function (req, res) {
  async.parallelLimit([
    function (callback) {
      callApi('custom_fields/query', 'post', { purpose: 'findAll', match: { $or: [{companyId: req.user.companyId}, {default: true}] } })
        .then(customFields => {
          callback(null, customFields)
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.fetchColumns`, req.body, {user: req.user}, 'error')
          callback(err)
        })
    },
    function (callback) {
      callApi(`integrations/query`, 'post', {companyId: req.user.companyId, integrationName: 'Hubspot'}, 'accounts', req.headers.authorization)
        .then(integrations => {
          let newTokens
          refreshAuthToken(integrations[0].integrationPayload.refresh_token)
            .then(tokens => {
              newTokens = tokens
              return saveNewTokens(integrations[0], tokens)
            })
            .then(updated => {
              return callHubspotApi('https://api.hubapi.com/forms/v2/forms/' + req.body.formId, 'get', null, newTokens.access_token)
            })
            .then(form => {
              callback(null, form)
            })
            .catch(err => {
              const message = err || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.fetchColumns`, req.body, {user: req.user}, 'error')
              callback(err)
            })
        })
        .catch(err => {
          const message = err || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.fetchColumns`, req.body, {user: req.user}, 'error')
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.fetchColumns`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Failed to fetch columns ${JSON.stringify(err)}`)
    } else {
      let dataToSend = {
        kiboPushColumns: populateKiboPushColumns(),
        customFieldColumns: [],
        hubspotColumns: []
      }
      let customFields = results[0]
      let hubspotData = results[1].formFieldGroups
      populateCustomFieldColumns(dataToSend, customFields)
        .then(dataToSend => {
          populateHubSpotColumns(dataToSend, hubspotData)
            .then(dataToSend => {
              sendSuccessResponse(res, 200, dataToSend)
            })
        })
    }
  })
}

function returnAuthToken (formData) {
  return new Promise((resolve, reject) => {
    request.post('https://api.hubapi.com/oauth/v1/token', { form: formData }, (error, data) => {
      if (error) {
        reject(error)
      } else {
        if (data.statusCode && data.statusCode === 200) {
          resolve(JSON.parse(data.body))
        } else {
          reject(data)
        }
      }
    })
  })
}

function refreshAuthToken (refreshToken) {
  const formData = {
    grant_type: 'refresh_token',
    client_id: config.hubspot.client_id,
    client_secret: config.hubspot.client_secret,
    redirect_uri: config.hubspot.callbackURL,
    refresh_token: refreshToken
  }
  return returnAuthToken(formData)
}

function saveNewTokens (oldPayload, tokens) {
  let newPayload = {
    companyId: oldPayload.companyId,
    userId: oldPayload.userId,
    integrationName: oldPayload.integrationName,
    integrationToken: tokens.access_token,
    integrationPayload: tokens,
    enabled: true
  }
  return dataLayer.update(oldPayload._id, newPayload)
}

function callHubspotApi (url, method, body, accessToken) {
  let options = {
    method: method.toUpperCase(),
    uri: url,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body,
    json: true
  }
  return new Promise((resolve, reject) => {
    request(options,
      (error, data) => {
        if (error) {
          reject(error)
        } else {
          if (data.statusCode && data.statusCode === 200) {
            resolve(data.body)
          } else {
            reject(data)
          }
        }
      })
  })
}

function populateHubSpotColumns (dataToSend, hubspotData) {
  return new Promise(function (resolve, reject) {
    if (hubspotData.length > 0) {
      for (let i = 0; i < hubspotData.length; i++) {
        for (let j = 0; j < hubspotData[i].fields.length; j++) {
          dataToSend.hubspotColumns.push({name: hubspotData[i].fields[j].name, displayLabel: hubspotData[i].fields[j].label})
        }
      }
      resolve(dataToSend)
    } else {
      resolve(dataToSend)
    }
  })
}

exports.refreshAuthToken = refreshAuthToken
exports.saveNewTokens = saveNewTokens
exports.callHubspotApi = callHubspotApi
