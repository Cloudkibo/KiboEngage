const AutopostingDataLayer = require('./autoposting.datalayer')
const AutoPostingLogicLayer = require('./autoposting.logiclayer')
const utility = require('../utility')
const logger = require('../../../components/logger')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      AutopostingDataLayer.findAllAutopostingObjectsUsingQuery({companyId: companyUser.companyId}, req.headers.authorization)
        .then(autoposting => {
          return res.status(200).json({
            status: 'success',
            payload: autoposting
          })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error while fetching autoposting${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    })
}

exports.create = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email, populate: 'companyId' }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      console.log('companyUser fetched', companyUser)
      // calling accounts feature usage for this
      utility.callApi(`featureUsage/planQuery`, 'post', {planId: companyUser.companyId.planId}, req.headers.authorization)
        .then(planUsage => {
          utility.callApi('featureUsage/companyQuery', 'post', {companyId: companyUser.companyId._id}, req.headers.authorization)
            .then(companyUsage => {
              AutopostingDataLayer.countAutopostingDocuments({companyId: companyUser.companyId._id, subscriptionType: req.body.subscriptionType})
                .then(gotCount => {
                  console.log('Got count', gotCount)
                  if (gotCount > 0 && !companyUser.enableMoreAutoPostingIntegration) {
                    return res.status(403).json({
                      status: 'Failed',
                      description: 'Cannot add more integrations. Please contact support or remove existing ones'
                    })
                  }
                  AutopostingDataLayer.findAllAutopostingObjectsUsingQuery({companyId: companyUser.companyId._id, subscriptionUrl: req.body.subscriptionUrl})
                    .then(data => {
                      console.log('data', data)
                      if (data.length > 0) {
                        return res.status(403).json({
                          status: 'Failed',
                          description: 'Cannot add duplicate accounts.'
                        })
                      }
                      let autoPostingPayload = AutoPostingLogicLayer.prepareAutopostingPayload(req, companyUser)
                      console.log('AutoPosting Payload', autoPostingPayload)
                      let hasLimit = AutoPostingLogicLayer.checkPlanLimit(req.body.subscriptionType, planUsage, companyUsage)
                      console.log('AutoPosting Limit', hasLimit)
                      // add paid plan check later
                      // if (!hasLimit) {
                      //   return res.status(500).json({
                      //     status: 'failed',
                      //     description: `Your ${req.body.subscriptionType} autopostings limit has reached. Please upgrade your plan to premium in order to add more feeds`
                      //   })
                      // }
                      if (req.body.subscriptionType === 'twitter') {
                        let url = req.body.subscriptionUrl
                        let urlAfterDot = url.substring(url.indexOf('.') + 1)
                        let screenName = urlAfterDot.substring(urlAfterDot.indexOf('/') + 1)
                        if (screenName.indexOf('/') > -1) screenName = screenName.substring(0, screenName.length - 1)
                        AutoPostingLogicLayer.findUser(screenName, (err, data) => {
                          console.log('Find User', err, data)
                          if (err) {
                            logger.serverLog(`Twitter URL parse Error ${err}`)
                          }
                          let payload
                          if (data && !data.errors) {
                            autoPostingPayload.accountUniqueName = data.screen_name
                            payload = {
                              id: data.id_str,
                              name: data.name,
                              screen_name: data.screen_name,
                              profile_image_url: data.profile_image_url_https
                            }
                            autoPostingPayload.payload = payload
                            AutopostingDataLayer.createAutopostingObject(autoPostingPayload)
                              .then(result => {
                                utility.callApi('featureUsage/updateCompany', 'put', {query: {companyId: companyUser.companyId._id}, newPayload: {$inc: { twitter_autoposting: 1 }}, options: {}}, req.headers.authorization)
                                  .then(result => {
                                    logger.serverLog('Company Usage updated')
                                  })
                                  .catch(err => {
                                    return res.status(500).json({
                                      status: 'failed',
                                      description: `Internal server error in updating plan usage ${err}`
                                    })
                                  })
                                utility.callApi('twitter/restart', 'get', {}, req.headers.authorization, 'webhook')
                                require('./../../../config/socketio').sendMessageToClient({
                                  room_id: companyUser.companyId._id,
                                  body: {
                                    action: 'autoposting_created',
                                    payload: {
                                      autoposting_id: result._id,
                                      user_id: req.user._id,
                                      user_name: req.user.name,
                                      payload: result
                                    }
                                  }
                                })
                                return res.status(201).json({status: 'success', payload: result})
                              })
                              .catch(err => {
                                return res.status(500).json({
                                  status: 'failed',
                                  description: `Internal Server Error while Creating Autoposting Objects ${JSON.stringify(err)}`
                                })
                              })
                          } else {
                            return logger.serverLog('Data Errors from Find User - Twitter')
                          }
                        })
                      }
                      if (req.body.subscriptionType === 'facebook') {
                        let screenName = AutoPostingLogicLayer.getFacebookScreenName(req.body.subscriptionUrl)
                        console.log('autoPostingPayload', autoPostingPayload)
                        utility.callApi(`pages/query`, 'post', {userId: req.user._id, $or: [{pageId: screenName}, {pageUserName: screenName}]}, req.headers.authorization)
                          .then(pageInfo => {
                            if (!pageInfo) {
                              return res.status(404).json({
                                status: 'Failed',
                                description: 'Cannot add this page or page not found'
                              })
                            }
                            autoPostingPayload.accountUniqueName = pageInfo.pageId
                            AutopostingDataLayer.createAutopostingObject(autoPostingPayload)
                              .then(result => {
                                utility.callApi('featureUsage/updateCompany', 'put', {query: {companyId: companyUser.companyId._id}, newPayload: {$inc: { facebook_autoposting: 1 }}, options: {}}, req.headers.authorization)
                                  .then(result => {
                                    logger.serverLog('Company Usage Updated')
                                  })
                                  .catch(err => {
                                    return res.status(500).json({
                                      status: 'failed',
                                      description: `Internal server error in updating plan usage ${err}`
                                    })
                                  })
                                require('./../../../config/socketio').sendMessageToClient({
                                  room_id: companyUser.companyId._id,
                                  body: {
                                    action: 'autoposting_created',
                                    payload: {
                                      autoposting_id: result._id,
                                      user_id: req.user._id,
                                      user_name: req.user.name,
                                      payload: result
                                    }
                                  }
                                })
                                return res.status(201)
                                  .json({status: 'success', payload: result})
                              })
                              .catch(err => {
                                return res.status(500).json({
                                  status: 'failed',
                                  description: `Internal Server Error while Creating Autoposting Objects ${JSON.stringify(err)}`
                                })
                              })
                          })
                          .catch(err => {
                            return res.status(403).json({
                              status: 'Failed',
                              description: `Error while fetching facebook page in autoposting${err}`
                            })
                          })
                      }
                      if (req.body.subscriptionType === 'youtube') {
                        let channelName = AutoPostingLogicLayer.getChannelName(req.body.subscriptionUrl)
                        autoPostingPayload.accountUniqueName = channelName
                        AutopostingDataLayer.createAutopostingObject(autoPostingPayload)
                          .then(result => {
                            return res.status(500).json({
                              status: 'success',
                              description: result
                            })
                          })
                          .catch(err => {
                            return res.status(500).json({
                              status: 'failed',
                              description: `Internal Server Error while Creating Autoposting Objects ${JSON.stringify(err)}`
                            })
                          })
                      }
                      if (req.body.subscriptionType === 'wordpress') {
                        let url = req.body.subscriptionUrl
                        let wordpressUniqueId = url.split('/')[0] + url.split('/')[1] + '//' + url.split('/')[2]
                        autoPostingPayload.accountUniqueName = wordpressUniqueId
                        AutopostingDataLayer.createAutopostingObject(autoPostingPayload)
                          .then(result => {
                            utility.callApi('featureUsage/updateCompany', 'put', {query: {companyId: companyUser.companyId._id}, newPayload: {$inc: { wordpress_autoposting: 1 }}, options: {}}, req.headers.authorization)
                              .then(result => {
                                require('./../../../config/socketio').sendMessageToClient({
                                  room_id: companyUser.companyId._id,
                                  body: {
                                    action: 'autoposting_created',
                                    payload: {
                                      autoposting_id: result._id,
                                      user_id: req.user._id,
                                      user_name: req.user.name,
                                      payload: result
                                    }
                                  }
                                })
                                return res.status(201)
                                  .json({status: 'success', payload: result})
                              })
                              .catch(err => {
                                return res.status(500).json({
                                  status: 'failed',
                                  description: `Internal server error in updating plan usage ${err}`
                                })
                              })
                          })
                      }
                    })
                    .catch(err => {
                      return res.status(500).json({
                        status: 'failed',
                        description: `Internal Server Error while fetching Autoposting Objects ${JSON.stringify(err)}`
                      })
                    })
                })
                .catch(err => {
                  return res.status(500).json({
                    status: 'failed',
                    description: `Internal Server Error while fetching count for autoposting ${JSON.stringify(err)}`
                  })
                })
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `Internal Server Error while fetching company usage ${JSON.stringify(err)}`
              })
            })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error while fetching plan usage ${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error while fetching company user ${JSON.stringify(err)}`
      })
    })
}
exports.edit = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      var autoposting = AutoPostingLogicLayer.prepareEditPayload(req)
      AutopostingDataLayer.genericFindByIdAndUpdate({_id: req.body._id}, autoposting)
        .then(autopostingUpdated => {
          if (!autoposting) {
            return res.status(404)
              .json({status: 'failed', description: 'Record not found'})
          }
          require('./../../../config/socketio').sendMessageToClient({
            room_id: companyUser.companyId,
            body: {
              action: 'autoposting_updated',
              payload: {
                autoposting_id: autoposting._id,
                user_id: req.user._id,
                user_name: req.user.name,
                payload: autoposting
              }
            }
          })
          return res.status(200).json({
            status: 'success',
            payload: autopostingUpdated
          })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error while fetching autoposting${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    })
}

exports.destroy = function (req, res) {
  AutopostingDataLayer.findOneAutopostingObject(req.params.id)
    .then(autoposting => {
      if (!autoposting) {
        return res.status(404)
          .json({status: 'failed', description: 'Record not found'})
      }
      AutopostingDataLayer.deleteAutopostingObject(autoposting._id)
        .then(result => {
          utility.callApi('twitter/restart', 'get', {}, req.headers.authorization, 'webhook')
          require('./../../../config/socketio').sendMessageToClient({
            room_id: autoposting.companyId,
            body: {
              action: 'autoposting_removed',
              payload: {
                autoposting_id: autoposting._id,
                user_id: req.user._id,
                user_name: req.user.name
              }
            }
          })
          return res.status(200).json({
            status: 'success',
            okfdescription: 'AutoPosting Deleted'
          })
        })
        .catch(err => {
          return res.status(500)
            .json({status: 'failed', description: `AutoPosting update failed ${err}`})
        })
    })
    .catch(err => {
      return res.status(500)
        .json({status: 'failed', description: `Internal Server Error in fetching autoposting object  ${err}`})
    })
}
