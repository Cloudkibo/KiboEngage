const utility = require('../utility')
const logicLayer = require('./landingPage.logiclayer')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const logger = require('../../../components/logger')
const TAG = 'api/landingPage/landingPage.controller.js'
const { updateCompanyUsage } = require('../../global/billingPricing')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      utility.callApi(`landingPage/query`, 'post', {companyId: companyUser.companyId})
        .then(landingPages => {
          sendSuccessResponse(res, 200, landingPages)
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch landingPages ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.update = function (req, res) {
  let updatedLandingPage = logicLayer.prepareUpdatePayload(req.body)
  utility.callApi(`landingPage/${req.params.id}`, 'put', updatedLandingPage)
    .then(updatedLandingPage => {
      // if (req.body.submittedState && req.body.submittedState.actionType === 'SHOW_NEW_MESSAGE') {
      //   console.log('inside submittedState', req.body)
      //   utility.callApi(`landingPage/landingPageState/${req.body.submittedState.state._id}`, 'put', req.body.submittedState.state, req.headers.authorization)
      //     .then(landingPage => {
      //       console.log('updatedLandingPage', landingPage)
      //     })
      //     .catch(error => {
      //       return res.status(500).json({status: 'failed', payload: `Failed to create landingPage ${JSON.stringify(error)}`})
      //     })
      // }
      utility.callApi(`landingPage/landingPageState/${req.body.initialState._id}`, 'put', req.body.initialState)
        .then(landingPage => {
          sendSuccessResponse(res, 200, landingPage)
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.update`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to create landingPage ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.update`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to create landingPageState ${(error)}`)
    })
}

exports.create = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      utility.callApi(`landingPage/landingPageState`, 'post', req.body.initialState)
        .then(landingPageState => {
          // if (req.body.submittedState.actionType === 'SHOW_NEW_MESSAGE') {
          //   console.log()
          //   utility.callApi(`landingPage/landingPageState`, 'post', req.body.submittedState.state, req.headers.authorization)
          //     .then(landingPageSubmittedState => {
          //       let payload = logicLayer.preparePayload(req.body, landingPageState, companyUser, landingPageSubmittedState)
          //       utility.callApi(`landingPage`, 'post', payload, req.headers.authorization)
          //         .then(landingPage => {
          //           return res.status(201).json({status: 'success', payload: landingPage})
          //         })
          //         .catch(error => {
          //           return res.status(500).json({status: 'failed', payload: `Failed to create landingPage ${JSON.stringify(error)}`})
          //         })
          //     })
          //     .catch(error => {
          //       return res.status(500).json({status: 'failed', payload: `Failed to create landingPageState ${JSON.stringify(error)}`})
          //     })
          // } else {
          let payload = logicLayer.preparePayload(req.body, landingPageState, companyUser)
          utility.callApi(`landingPage`, 'post', payload)
            .then(landingPage => {
              updateCompanyUsage(req.user.companyId, 'landing_pages', 1)
              sendSuccessResponse(res, 200, landingPage)
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to create landingPage ${JSON.stringify(error)}`)
            })
        }
        // }
        )
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to create landingPageState ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.delete = function (req, res) {
  utility.callApi(`landingPage/query`, 'post', {_id: req.params.id, companyId: req.user.companyId})
    .then(landingPages => {
      let landingPage = landingPages[0]
      utility.callApi(`landingPage/landingPageState/${landingPage.initialState._id}`, 'delete', {})
        .then(result => {
          utility.callApi(`landingPage/${req.params.id}`, 'delete', {})
            .then(result => {
              updateCompanyUsage(req.user.companyId, 'landing_pages', -1)
              sendSuccessResponse(res, 200, result)
            })
            .catch(error => {
              const message = error || 'Internal Server Error'
              logger.serverLog(message, `${TAG}: exports.delete`, req.body, {user: req.user}, 'error')
              sendErrorResponse(res, 500, `Failed to delete landingPage ${JSON.stringify(error)}`)
            })
        })
        .catch(error => {
          const message = error || 'Internal Server Error'
          logger.serverLog(message, `${TAG}: exports.delete`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to delete landingPageState ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Internal Server Error'
      logger.serverLog(message, `${TAG}: exports.delete`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to delete landingPageState ${JSON.stringify(error)}`)
    })
}
