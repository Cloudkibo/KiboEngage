const logger = require('../../../components/logger')
const TAG = 'api/phoneNumber/phoneNumber.controller.js'
const utility = require('../utility')
const logicLayer = require('./phoneNumber.logiclayer')
const fs = require('fs')
const csv = require('csv-parser')
let request = require('request')

exports.upload = function (req, res) {
  let directory = logicLayer.directory(req)
  let abort = false
  if (req.files.file.size === 0) {
    return res.status(400).json({
      status: 'failed',
      description: 'No file submitted'
    })
  }
  utility.callApi(`companyprofile/query`, 'post', {ownerId: req.user._id})
    .then(companyProfile => {
      utility.callApi(`usage/planGeneric`, 'post', {planId: companyProfile.planId})
        .then(planUsage => {
          planUsage = planUsage[0]
          utility.callApi(`usage/companyGeneric`, 'post', {companyId: companyProfile._id})
            .then(companyUsage => {
              companyUsage = companyUsage[0]
              utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
                .then(companyUser => {
                  if (planUsage.phone_invitation !== -1 && companyUsage.phone_invitation >= planUsage.phone_invitation) {
                    return res.status(500).json({
                      status: 'failed',
                      description: `Your phone invitations limit has reached. Please upgrade your plan to premium in order to send more invitations.`
                    })
                  }
                  let newFileName = req.files.file.name.substring(0, req.files.file.name.indexOf('.'))
                  let query = {initialList: true, userId: req.user._id, companyId: companyUser.companyId, listName: newFileName}
                  let update = { listName: newFileName,
                    userId: req.user._id,
                    companyId: companyUser.companyId,
                    conditions: 'initial_list',
                    initialList: true
                  }
                  utility.callApi(`lists/update`, 'put', {query: query, newPayload: update, options: {upsert: true}})
                    .then(savedList => {
                      fs.rename(req.files.file.path, directory.dir + '/userfiles' + directory.serverPath, err => {
                        if (err) {
                          return res.status(500).json({
                            status: 'failed',
                            description: 'internal server error' + JSON.stringify(err)
                          })
                        }
                        let respSent = false
                        let phoneColumn = req.body.phoneColumn
                        let nameColumn = req.body.nameColumn
                        fs.createReadStream(directory.dir + '/userfiles' + directory.serverPath)
                          .pipe(csv())
                          .on('data', function (data) {
                            if (data[`${phoneColumn}`] && data[`${nameColumn}`]) {
                              var result = data[`${phoneColumn}`].replace(/[- )(]+_/g, '')
                              utility.callApi(`phone/query`, 'post', {
                                number: result, userId: req.user._id, companyId: companyUser.companyId, pageId: req.body._id})
                                .then(phone => {
                                  if (phone.length === 0) {
                                    if (planUsage.phone_invitation !== -1 && companyUsage.phone_invitation >= planUsage.phone_invitation) {
                                      if (!abort) {
                                        abort = true
                                        // to do in kibochat
                                        // webhookUtility.limitReachedNotification('invitations', companyProfile)
                                      }
                                    } else {
                                      utility.callApi(`phone`, 'post', {
                                        name: data[`${nameColumn}`],
                                        number: result,
                                        userId: req.user._id,
                                        companyId: companyUser.companyId,
                                        pageId: req.body._id,
                                        fileName: newFileName,
                                        hasSubscribed: false })
                                        .then(saved => {
                                          utility.callApi(`updateCompany/`, 'put', {
                                            query: {companyId: companyUser.companyId},
                                            newPayload: { $inc: { phone_invitation: 1 } },
                                            options: {}
                                          })
                                            .then(updated => {})
                                            .catch(error => {
                                              return res.status(500).json({
                                                status: 'failed',
                                                payload: `Failed to update company usage ${JSON.stringify(error)}`
                                              })
                                            })
                                        })
                                        .catch(error => {
                                          return res.status(500).json({
                                            status: 'failed',
                                            payload: `Failed to save phone number ${JSON.stringify(error)}`
                                          })
                                        })
                                    }
                                  } else {
                                    let filename = logicLayer.getFiles(phone, req, newFileName)
                                    let query = {number: result, userId: req.user._id, companyId: companyUser.companyId, pageId: req.body._id}
                                    let update = { name: data[`${nameColumn}`],
                                      number: result,
                                      userId: req.user._id,
                                      companyId: companyUser.companyId,
                                      pageId: req.body._id,
                                      fileName: filename
                                    }
                                    utility.callApi(`phone/update`, 'put', {query: query, newPayload: update, options: {upsert: true}})
                                      .then(phonenumbersaved => {
                                        utility.callApi(`phone/query`, 'post', {companyId: companyUser.companyId, hasSubscribed: true, fileName: newFileName})
                                          .then(number => {
                                            if (number.length > 0) {
                                              let subscriberFindCriteria = logicLayer.subscriberFindCriteria(number, companyUser)
                                              utility.callApi(`subscribers/query`, 'post', subscriberFindCriteria)
                                                .then(subscribers => {
                                                  let content = logicLayer.getContent(subscribers)
                                                  let query = {listName: newFileName, userId: req.user._id, companyId: companyUser.companyId}
                                                  let update = { content: content }
                                                  utility.callApi(`lists/update`, 'put', {query: query, newPayload: update, options: {}})
                                                    .then(savedList => {
                                                    })
                                                    .catch(error => {
                                                      return res.status(500).json({
                                                        status: 'failed',
                                                        payload: `Failed to update list ${JSON.stringify(error)}`
                                                      })
                                                    })
                                                })
                                                .catch(error => {
                                                  return res.status(500).json({
                                                    status: 'failed',
                                                    payload: `Failed to fetch subscribers ${JSON.stringify(error)}`
                                                  })
                                                })
                                            }
                                          })
                                          .catch(error => {
                                            return res.status(500).json({
                                              status: 'failed',
                                              payload: `Failed to update number ${JSON.stringify(error)}`
                                            })
                                          })
                                      })
                                      .catch(error => {
                                        return res.status(500).json({
                                          status: 'failed',
                                          payload: `Failed to update number ${JSON.stringify(error)}`
                                        })
                                      })
                                  }
                                })
                                .catch(error => {
                                  return res.status(500).json({
                                    status: 'failed',
                                    payload: `Failed to update number ${JSON.stringify(error)}`
                                  })
                                })
                              utility.callApi(`pages/query`, 'post', {userId: req.user._id, connected: true, pageId: req.body.pageId})
                                .then(pages => {
                                  pages.forEach(page => {
                                    let messageData = {
                                      'messaging_type': 'UPDATE',
                                      'recipient': JSON.stringify({
                                        'phone_number': result
                                      }),
                                      'message': JSON.stringify({
                                        'text': req.body.text,
                                        'metadata': 'This is a meta data'
                                      })
                                    }
                                    request(
                                      {
                                        'method': 'POST',
                                        'json': true,
                                        'formData': messageData,
                                        'uri': 'https://graph.facebook.com/v2.6/me/messages?access_token=' +
                                        page.accessToken
                                      },
                                      function (err, res) {
                                        if (err) {
                                          return logger.serverLog(TAG,
                                            `At invite to messenger using phone ${JSON.stringify(
                                              err)}`)
                                        }
                                      })
                                  })
                                })
                                .catch(error => {
                                  return res.status(500).json({
                                    status: 'failed',
                                    payload: `Failed to fetch pages ${JSON.stringify(error)}`
                                  })
                                })
                              if (respSent === false) {
                                respSent = true
                                return res.status(201)
                                  .json({
                                    status: 'success',
                                    description: 'Contacts were invited to your messenger'
                                  })
                              }
                            } else {
                              return res.status(404)
                                .json({status: 'failed', description: 'Incorrect column names'})
                            }
                          })
                          .on('end', function () {
                            fs.unlinkSync(directory.dir + '/userfiles' + directory.serverPath)
                          })
                      })
                    })
                    .catch(error => {
                      return res.status(500).json({
                        status: 'failed',
                        payload: `Failed to fetch update list ${JSON.stringify(error)}`
                      })
                    })
                })
                .catch(error => {
                  return res.status(500).json({
                    status: 'failed',
                    payload: `Failed to company user ${JSON.stringify(error)}`
                  })
                })
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch company usage ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch plan usage ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company profile ${JSON.stringify(error)}`
      })
    })
}
exports.sendNumbers = function (req, res) {
  let abort = false
  utility.callApi(`companyprofile/query`, 'post', {ownerId: req.user._id})
    .then(companyProfile => {
      utility.callApi(`usage/planGeneric`, 'post', {planId: companyProfile.planId})
        .then(planUsage => {
          planUsage = planUsage[0]
          utility.callApi(`usage/companyGeneric`, 'post', {companyId: companyProfile._id})
            .then(companyUsage => {
              companyUsage = companyUsage[0]
              if (planUsage.phone_invitation !== -1 && companyUsage.phone_invitation >= planUsage.phone_invitation) {
                return res.status(500).json({
                  status: 'failed',
                  description: `Your phone invitations limit has reached. Please upgrade your plan to premium in order to send more invitations.`
                })
              }
              utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
                .then(companyUser => {
                  let query = {initialList: true, userId: req.user._id, companyId: companyUser.companyId, listName: 'Other'}
                  let update = { listName: 'Other',
                    userId: req.user._id,
                    companyId: companyUser.companyId,
                    conditions: 'initial_list',
                    initialList: true
                  }
                  utility.callApi(`lists/update`, 'put', {query: query, newPayload: update, options: {upsert: true}})
                    .then(savedList => {
                    })
                    .catch(error => {
                      return res.status(500).json({
                        status: 'failed',
                        payload: `Failed to update list ${JSON.stringify(error)}`
                      })
                    })
                  for (let i = 0; i < req.body.numbers.length && !abort; i++) {
                    let result = req.body.numbers[i].replace(/[- )(]+_/g, '')
                    utility.callApi(`pages/query`, 'post', {userId: req.user._id, connected: true, pageId: req.body.pageId})
                      .then(pages => {
                        utility.callApi(`phone/query`, 'post', {number: result, userId: req.user._id, companyId: companyUser.companyId, pageId: req.body._id})
                          .then(found => {
                            if (found.length === 0) {
                              if (planUsage.phone_invitation !== -1 && companyUsage.phone_invitation >= planUsage.phone_invitation) {
                                abort = true
                                //  webhookUtility.limitReachedNotification('invitations', companyProfile)
                              } else {
                                utility.callApi(`phone`, 'post', { name: '',
                                  number: result,
                                  userId: req.user._id,
                                  companyId: companyUser.companyId,
                                  pageId: req.body._id,
                                  fileName: 'Other',
                                  hasSubscribed: false })
                                  .then(saved => {
                                    utility.callApi(`updateCompany/`, 'put', {
                                      query: {companyId: req.body.companyId},
                                      newPayload: { $inc: { phone_invitation: 1 } },
                                      options: {}
                                    })
                                      .then(updated => {
                                      })
                                      .catch(error => {
                                        return res.status(500).json({
                                          status: 'failed',
                                          payload: `Failed to update company usage ${JSON.stringify(error)}`
                                        })
                                      })
                                  })
                                  .catch(error => {
                                    return res.status(500).json({
                                      status: 'failed',
                                      payload: `Failed to update number ${JSON.stringify(error)}`
                                    })
                                  })
                              }
                            } else {
                              let filename = logicLayer.getFilesManual(found)
                              let query = {number: result, userId: req.user._id, companyId: companyUser.companyId, pageId: req.body._id}
                              let update = { name: '',
                                number: result,
                                userId: req.user._id,
                                companyId: companyUser.companyId,
                                pageId: req.body._id,
                                fileName: filename
                              }
                              utility.callApi(`phone/update`, 'put', {query: query, newPayload: update, options: {upsert: true}})
                                .then(phonenumbersaved => {
                                  utility.callApi(`phone/query`, 'post', {companyId: companyUser.companyId, hasSubscribed: true, fileName: 'Other'})
                                    .then(number => {
                                      if (number.length > 0) {
                                        let subscriberFindCriteria = logicLayer.subscriberFindCriteria(number, companyUser)
                                        utility.callApi(`subscribers/query`, 'post', subscriberFindCriteria)
                                          .then(subscribers => {
                                            let content = logicLayer.getContent(subscribers)
                                            let query = {listName: 'Other', userId: req.user._id, companyId: companyUser.companyId}
                                            let update = { content: content }
                                            utility.callApi(`lists/update`, 'put', {query: query, newPayload: update, options: {}})
                                              .then(savedList => {})
                                              .catch(error => {
                                                return res.status(500).json({
                                                  status: 'failed',
                                                  payload: `Failed to update list ${JSON.stringify(error)}`
                                                })
                                              })
                                          })
                                          .catch(error => {
                                            return res.status(500).json({
                                              status: 'failed',
                                              payload: `Failed to fetch subscribers ${JSON.stringify(error)}`
                                            })
                                          })
                                      }
                                    })
                                    .catch(error => {
                                      return res.status(500).json({
                                        status: 'failed',
                                        payload: `Failed to fetch number ${JSON.stringify(error)}`
                                      })
                                    })
                                })
                                .catch(error => {
                                  return res.status(500).json({
                                    status: 'failed',
                                    payload: `Failed to update phone number ${JSON.stringify(error)}`
                                  })
                                })
                            }
                          })
                          .catch(error => {
                            return res.status(500).json({
                              status: 'failed',
                              payload: `Failed to fetch numbers ${JSON.stringify(error)}`
                            })
                          })
                        pages.forEach(page => {
                          let messageData = {
                            'messaging_type': 'UPDATE',
                            'recipient': JSON.stringify({
                              'phone_number': result
                            }),
                            'message': JSON.stringify({
                              'text': req.body.text,
                              'metadata': 'This is a meta data'
                            })
                          }
                          request(
                            {
                              'method': 'POST',
                              'json': true,
                              'formData': messageData,
                              'uri': 'https://graph.facebook.com/v2.6/me/messages?access_token=' +
                              page.accessToken
                            },
                            function (err, res) {
                              if (err) {
                                return logger.serverLog(TAG,
                                  `Error At invite to messenger using phone ${JSON.stringify(
                                    err)}`)
                              }
                            })
                        })
                      })
                      .catch(error => {
                        return res.status(500).json({
                          status: 'failed',
                          payload: `Failed to fetch connected pages ${JSON.stringify(error)}`
                        })
                      })
                  }
                  return res.status(201).json({
                    status: 'success',
                    description: 'Contacts were invited to your messenger'
                  })
                })
                .catch(error => {
                  return res.status(500).json({
                    status: 'failed',
                    payload: `Failed to fetch company user ${JSON.stringify(error)}`
                  })
                })
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to fetch company usage ${JSON.stringify(error)}`
              })
            })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch plan usage ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company profile ${JSON.stringify(error)}`
      })
    })
}

exports.pendingSubscription = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      utility.callApi(`phone/query`, 'post', {
        companyId: companyUser.companyId, hasSubscribed: false, fileName: req.params.name})
        .then(phonenumbers => {
          return res.status(200)
            .json({status: 'success', payload: phonenumbers})
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch numbers ${JSON.stringify(error)}`
          })
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}
