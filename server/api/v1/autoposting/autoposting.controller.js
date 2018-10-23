const AutopostingDataLayer = require('./autoposting.datalayer')
const AutoPostingLogicLayer = require('./autoposting.logiclayer')
const utility = '../utility'

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      AutopostingDataLayer.findAllAutopostingObjectsUsingQuery({companyId: companyUser.companyId})
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
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      utility.callApi(`companyProfile/query`, 'post', {ownerId: req.user._id})
        .then(companyProfile => {
          // calling accounts feature usage for this
          utility.callApi(`featureUsage/planUsage/query`, 'post', {planId: companyProfile.planId})
            .then(planUsage => {
              utility.callApi('featureUsage/companyUsage/query', 'post', {companyId: companyProfile._id})
                .then(companyUsage => {
                  AutopostingDataLayer.countAutopostingDocuments({companyId: companyUser.companyId, subscriptionType: req.body.subscriptionType})
                    .then(gotCount => {
                      if (gotCount > 0 && !companyUser.enableMoreAutoPostingIntegration) {
                        return res.status(403).json({
                          status: 'Failed',
                          description: 'Cannot add more integrations. Please contact support or remove existing ones'
                        })
                      }
                      AutopostingDataLayer.findAllAutopostingObjectsUsingQuery({companyId: companyUser.companyId, subscriptionUrl: req.body.subscriptionUrl})
                        .then(data => {
                          if (data.length > 0) {
                            return res.status(403).json({
                              status: 'Failed',
                              description: 'Cannot add duplicate accounts.'
                            })
                          }
                          let autoPostingPayload = AutoPostingLogicLayer.prepareAutopostingPayload(req, companyUser)
                          let hasLimit = AutoPostingLogicLayer.checkPlanLimit(req.body.subscriptionType)
                          if (!hasLimit) {
                            return res.status(500).json({
                              status: 'failed',
                              description: `Your ${req.body.subscriptionType} autopostings limit has reached. Please upgrade your plan to premium in order to add more feeds`
                            })
                          }
                          if (req.body.subscriptionType === 'twitter') {
                            let autopostingPayload = AutoPostingLogicLayer.handleTwitterAutoposts(req.body.subscriptionUrl, autoPostingPayload)
                            AutopostingDataLayer.createAutopostingObject(autopostingPayload)
                              .then(result => {
                                utility.callApi('featureUsage/companyUsage/update', 'post', {query: {companyId: companyProfile._id}, update: {$inc: { twitter_autoposting: 1 }}})
                                  .then(result => {
                                    utility.callApi('twitter/restart')
                                    require('./../../../config/socketio').sendMessageToClient({
                                      room_id: companyUser.companyId,
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
                              .catch(err => {
                                return res.status(500).json({
                                  status: 'failed',
                                  description: `Internal Server Error while Creating Autoposting Objects ${JSON.stringify(err)}`
                                })
                              })
                          }
                          if (req.body.subscriptionType === 'facebook') {
                            let screenName = AutoPostingLogicLayer.getFacebookScreenName(req.body.subscriptionUrl)
                            utility.callApi(`page/query`, 'post', {userId: req.user._id, $or: [{pageId: screenName}, {pageUserName: screenName}]})
                              .then(pageInfo => {
                                if (!pageInfo) {
                                  return res.status(404).json({
                                    status: 'Failed',
                                    description: 'Cannot add this page or page not found'
                                  })
                                }
                                autoPostingPayload.accountUniqueName = pageInfo.pageId
                                let autopostingPayload = AutoPostingLogicLayer.handleTwitterAutoposts(req.body.subscriptionUrl, autoPostingPayload)
                                AutopostingDataLayer.createAutopostingObject(autopostingPayload)
                                  .then(result => {
                                    utility.callApi('featureUsage/companyUsage/update', 'post', {query: {companyId: companyProfile._id}, update: {$inc: {facebook_autoposting: 1}}})
                                      .then(result => {
                                        require('./../../../config/socketio').sendMessageToClient({
                                          room_id: companyUser.companyId,
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
                                utility.callApi('featureUsage/companyUsage/update', 'post', {query: {companyId: companyProfile._id}, update: {$inc: {wordpress_autoposting: 1}}})
                                  .then(result => {
                                    require('./../../../config/socketio').sendMessageToClient({
                                      room_id: companyUser.companyId,
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
            description: `Internal Server Error while fetching company profile ${JSON.stringify(err)}`
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
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
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
          utility.callApi('twitter/restart')
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
          return res.status(204).end()
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
