/**
 * Created by sojharo on 27/07/2017.
 */

const logger = require('../../../components/logger')
const Pages = require('./Pages.model')
const TAG = 'api/pages/pages.controller.js'
const CompanyUsers = require('./../companyuser/companyuser.model')
const Users = require('./../user/Users.model')
const needle = require('needle')
const Subscribers = require('../subscribers/Subscribers.model')
const CompanyUsage = require('./../featureUsage/companyUsage.model')
const PlanUsage = require('./../featureUsage/planUsage.model')
const CompanyProfile = require('./../companyprofile/companyprofile.model')
exports.index = function (req, res) {
  CompanyUsers.findOne({domain_email: req.user.domain_email},
    (err, companyUser) => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      Pages.find({connected: true, companyId: companyUser.companyId},
        (err, pages) => {
          if (err) {
            logger.serverLog(TAG, `Error: ${err}`)
            return res.status(500).json({
              status: 'failed',
              description: `Internal Server Error${JSON.stringify(err)}`
            })
          }
          res.status(200).json({status: 'success', payload: pages})
        })
    })
}
exports.allpages = function (req, res) {
  CompanyUsers.findOne({domain_email: req.user.domain_email},
    (err, companyUser) => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      Pages.find({connected: true, companyId: companyUser.companyId},
        (err, pages) => {
          if (err) {
            return res.status(404).json({
              status: 'failed',
              description: `Error in getting pages ${JSON.stringify(err)}`
            })
          }
          Subscribers.aggregate([
            {$match: {isSubscribed: true}},
            {
              $group: {
                _id: {pageId: '$pageId'},
                count: {$sum: 1}
              }
            }], (err2, gotSubscribersCount) => {
            if (err2) {
              return res.status(404).json({
                status: 'failed',
                description: `Error in getting pages subscriber count ${JSON.stringify(
                  err2)}`
              })
            }
            Subscribers.aggregate([
              {$match: {isSubscribed: false}},
              {
                $group: {
                  _id: {pageId: '$pageId'},
                  count: {$sum: 1}
                }
              }], (err2, gotUnSubscribersCount) => {
              if (err2) {
                return res.status(404).json({
                  status: 'failed',
                  description: `Error in getting pages subscriber count ${JSON.stringify(
                    err2)}`
                })
              }
              let pagesPayload = []
              for (let i = 0; i < pages.length; i++) {
                pagesPayload.push({
                  _id: pages[i]._id,
                  pageId: pages[i].pageId,
                  gotPageSubscriptionPermission: pages[i].gotPageSubscriptionPermission,
                  pageName: pages[i].pageName,
                  userId: pages[i].userId,
                  pagePic: pages[i].pagePic,
                  connected: pages[i].connected,
                  pageUserName: pages[i].pageUserName,
                  likes: pages[i].likes,
                  isWelcomeMessageEnabled: pages[i].isWelcomeMessageEnabled,
                  welcomeMessage: pages[i].welcomeMessage,
                  subscribers: 0,
                  unsubscribes: 0,
                  greetingText: pages[i].greetingText
                })
              }
              for (let i = 0; i < pagesPayload.length; i++) {
                for (let j = 0; j < gotSubscribersCount.length; j++) {
                  if (pagesPayload[i]._id.toString() ===
                    gotSubscribersCount[j]._id.pageId.toString()) {
                    pagesPayload[i].subscribers = gotSubscribersCount[j].count
                  }
                }
              }
              for (let i = 0; i < pagesPayload.length; i++) {
                for (let j = 0; j < gotUnSubscribersCount.length; j++) {
                  if (pagesPayload[i]._id.toString() ===
                    gotUnSubscribersCount[j]._id.pageId.toString()) {
                    pagesPayload[i].unsubscribes = gotUnSubscribersCount[j].count
                  }
                }
              }
              res.status(200).json({
                status: 'success',
                payload: pagesPayload
              })
            })
          })
        })
    })
}
exports.getAllpages = function (req, res) {
  /*
  body = {
    first_page:
    last_id:
    number_of_records:
    filter:
    filter_criteria: {
      search_value:
  }
}
  */
  CompanyUsers.findOne({domain_email: req.user.domain_email},
    (err, companyUser) => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      if (req.body.first_page === 'first') {
        if (!req.body.filter) {
          Pages.aggregate([
            { $match: {connected: true, companyId: companyUser.companyId} },
            { $group: { _id: null, count: { $sum: 1 } } }
          ], (err, pagesCount) => {
            if (err) {
              return res.status(404)
                .json({status: 'failed', description: 'PagesCount not found'})
            }
            Pages.find({connected: true, companyId: companyUser.companyId}).limit(req.body.number_of_records)
            .exec((err, pages) => {
              if (err) {
                return res.status(404).json({
                  status: 'failed',
                  description: `Error in getting pages ${JSON.stringify(err)}`
                })
              }
              Subscribers.aggregate([
                {$match: {isSubscribed: true}},
                {
                  $group: {
                    _id: {pageId: '$pageId'},
                    count: {$sum: 1}
                  }
                }], (err2, gotSubscribersCount) => {
                if (err2) {
                  return res.status(404).json({
                    status: 'failed',
                    description: `Error in getting pages subscriber count ${JSON.stringify(
                      err2)}`
                  })
                }
                Subscribers.aggregate([
                  {$match: {isSubscribed: false}},
                  {
                    $group: {
                      _id: {pageId: '$pageId'},
                      count: {$sum: 1}
                    }
                  }], (err2, gotUnSubscribersCount) => {
                  if (err2) {
                    return res.status(404).json({
                      status: 'failed',
                      description: `Error in getting pages subscriber count ${JSON.stringify(
                        err2)}`
                    })
                  }
                  let pagesPayload = []
                  for (let i = 0; i < pages.length; i++) {
                    pagesPayload.push({
                      _id: pages[i]._id,
                      pageId: pages[i].pageId,
                      pageName: pages[i].pageName,
                      userId: pages[i].userId,
                      pagePic: pages[i].pagePic,
                      connected: pages[i].connected,
                      pageUserName: pages[i].pageUserName,
                      likes: pages[i].likes,
                      isWelcomeMessageEnabled: pages[i].isWelcomeMessageEnabled,
                      welcomeMessage: pages[i].welcomeMessage,
                      subscribers: 0,
                      unsubscribes: 0,
                      greetingText: pages[i].greetingText,
                      gotPageSubscriptionPermission: pages[i].gotPageSubscriptionPermission
                    })
                  }
                  for (let i = 0; i < pagesPayload.length; i++) {
                    for (let j = 0; j < gotSubscribersCount.length; j++) {
                      if (pagesPayload[i]._id.toString() ===
                        gotSubscribersCount[j]._id.pageId.toString()) {
                        pagesPayload[i].subscribers = gotSubscribersCount[j].count
                      }
                    }
                  }
                  for (let i = 0; i < pagesPayload.length; i++) {
                    for (let j = 0; j < gotUnSubscribersCount.length; j++) {
                      if (pagesPayload[i]._id.toString() ===
                        gotUnSubscribersCount[j]._id.pageId.toString()) {
                        pagesPayload[i].unsubscribes = gotUnSubscribersCount[j].count
                      }
                    }
                  }
                  res.status(200).json({
                    status: 'success',
                    payload: {pages: pagesPayload, count: pagesCount.length > 0 ? pagesCount[0].count : 0, last_id: pagesPayload.length > 0 ? pagesPayload[pagesPayload.length - 1]._id : ''}
                  })
                })
              })
            })
          })
        } else {
          let search = new RegExp('.*' + req.body.filter_criteria.search_value + '.*', 'i')
          let findCriteria = {
            connected: true,
            companyId: companyUser.companyId,
            pageName: req.body.filter_criteria.search_value !== '' ? {$regex: search} : {$exists: true}
          }
          Pages.aggregate([
            { $match: findCriteria },
            { $group: { _id: null, count: { $sum: 1 } } }
          ], (err, pagesCount) => {
            if (err) {
              return res.status(404)
                .json({status: 'failed', description: 'PagesCount not found'})
            }
            Pages.find(findCriteria).limit(req.body.number_of_records)
            .exec((err, pages) => {
              if (err) {
                return res.status(404).json({
                  status: 'failed',
                  description: `Error in getting pages ${JSON.stringify(err)}`
                })
              }
              Subscribers.aggregate([
                {$match: {isSubscribed: true}},
                {
                  $group: {
                    _id: {pageId: '$pageId'},
                    count: {$sum: 1}
                  }
                }], (err2, gotSubscribersCount) => {
                if (err2) {
                  return res.status(404).json({
                    status: 'failed',
                    description: `Error in getting pages subscriber count ${JSON.stringify(
                      err2)}`
                  })
                }
                Subscribers.aggregate([
                  {$match: {isSubscribed: false}},
                  {
                    $group: {
                      _id: {pageId: '$pageId'},
                      count: {$sum: 1}
                    }
                  }], (err2, gotUnSubscribersCount) => {
                  if (err2) {
                    return res.status(404).json({
                      status: 'failed',
                      description: `Error in getting pages subscriber count ${JSON.stringify(
                        err2)}`
                    })
                  }
                  let pagesPayload = []
                  for (let i = 0; i < pages.length; i++) {
                    pagesPayload.push({
                      _id: pages[i]._id,
                      pageId: pages[i].pageId,
                      pageName: pages[i].pageName,
                      userId: pages[i].userId,
                      pagePic: pages[i].pagePic,
                      connected: pages[i].connected,
                      pageUserName: pages[i].pageUserName,
                      likes: pages[i].likes,
                      isWelcomeMessageEnabled: pages[i].isWelcomeMessageEnabled,
                      welcomeMessage: pages[i].welcomeMessage,
                      subscribers: 0,
                      unsubscribes: 0,
                      greetingText: pages[i].greetingText
                    })
                  }
                  for (let i = 0; i < pagesPayload.length; i++) {
                    for (let j = 0; j < gotSubscribersCount.length; j++) {
                      if (pagesPayload[i]._id.toString() ===
                        gotSubscribersCount[j]._id.pageId.toString()) {
                        pagesPayload[i].subscribers = gotSubscribersCount[j].count
                      }
                    }
                  }
                  for (let i = 0; i < pagesPayload.length; i++) {
                    for (let j = 0; j < gotUnSubscribersCount.length; j++) {
                      if (pagesPayload[i]._id.toString() ===
                        gotUnSubscribersCount[j]._id.pageId.toString()) {
                        pagesPayload[i].unsubscribes = gotUnSubscribersCount[j].count
                      }
                    }
                  }
                  res.status(200).json({
                    status: 'success',
                    payload: {pages: pagesPayload, count: pagesCount.length > 0 ? pagesCount[0].count : 0, last_id: pagesPayload.length > 0 ? pagesPayload[pagesPayload.length - 1]._id : ''}
                  })
                })
              })
            })
          })
        }
      } else if (req.body.first_page === 'next') {
        let recordsToSkip = Math.abs(((req.body.requested_page - 1) - (req.body.current_page))) * req.body.number_of_recordsg
        if (!req.body.filter) {
          Pages.aggregate([
            { $match: {connected: true, companyId: companyUser.companyId} },
            { $group: { _id: null, count: { $sum: 1 } } }
          ], (err, pagesCount) => {
            if (err) {
              return res.status(404)
                .json({status: 'failed', description: 'PagesCount not found'})
            }
            Pages.find({connected: true, companyId: companyUser.companyId, _id: {$gt: req.body.last_id}}).skip(recordsToSkip).limit(req.body.number_of_records)
            .exec((err, pages) => {
              if (err) {
                return res.status(404).json({
                  status: 'failed',
                  description: `Error in getting pages ${JSON.stringify(err)}`
                })
              }
              Subscribers.aggregate([
                {$match: {isSubscribed: true}},
                {
                  $group: {
                    _id: {pageId: '$pageId'},
                    count: {$sum: 1}
                  }
                }], (err2, gotSubscribersCount) => {
                if (err2) {
                  return res.status(404).json({
                    status: 'failed',
                    description: `Error in getting pages subscriber count ${JSON.stringify(
                      err2)}`
                  })
                }
                Subscribers.aggregate([
                  {$match: {isSubscribed: false}},
                  {
                    $group: {
                      _id: {pageId: '$pageId'},
                      count: {$sum: 1}
                    }
                  }], (err2, gotUnSubscribersCount) => {
                  if (err2) {
                    return res.status(404).json({
                      status: 'failed',
                      description: `Error in getting pages subscriber count ${JSON.stringify(
                        err2)}`
                    })
                  }
                  let pagesPayload = []
                  for (let i = 0; i < pages.length; i++) {
                    pagesPayload.push({
                      _id: pages[i]._id,
                      pageId: pages[i].pageId,
                      pageName: pages[i].pageName,
                      userId: pages[i].userId,
                      pagePic: pages[i].pagePic,
                      connected: pages[i].connected,
                      pageUserName: pages[i].pageUserName,
                      likes: pages[i].likes,
                      isWelcomeMessageEnabled: pages[i].isWelcomeMessageEnabled,
                      welcomeMessage: pages[i].welcomeMessage,
                      subscribers: 0,
                      unsubscribes: 0,
                      greetingText: pages[i].greetingText
                    })
                  }
                  for (let i = 0; i < pagesPayload.length; i++) {
                    for (let j = 0; j < gotSubscribersCount.length; j++) {
                      if (pagesPayload[i]._id.toString() ===
                        gotSubscribersCount[j]._id.pageId.toString()) {
                        pagesPayload[i].subscribers = gotSubscribersCount[j].count
                      }
                    }
                  }
                  for (let i = 0; i < pagesPayload.length; i++) {
                    for (let j = 0; j < gotUnSubscribersCount.length; j++) {
                      if (pagesPayload[i]._id.toString() ===
                        gotUnSubscribersCount[j]._id.pageId.toString()) {
                        pagesPayload[i].unsubscribes = gotUnSubscribersCount[j].count
                      }
                    }
                  }
                  res.status(200).json({
                    status: 'success',
                    payload: {pages: pagesPayload, count: pagesCount.length > 0 ? pagesCount[0].count : 0, last_id: pagesPayload.length > 0 ? pagesPayload[pagesPayload.length - 1]._id : ''}
                  })
                })
              })
            })
          })
        } else {
          let search = new RegExp('.*' + req.body.filter_criteria.search_value + '.*', 'i')
          let findCriteria = {
            connected: true,
            companyId: companyUser.companyId,
            pageName: req.body.filter_criteria.search_value !== '' ? {$regex: search} : {$exists: true}
          }
          Pages.aggregate([
            { $match: findCriteria },
            { $group: { _id: null, count: { $sum: 1 } } }
          ], (err, pagesCount) => {
            if (err) {
              return res.status(404)
                .json({status: 'failed', description: 'PagesCount not found'})
            }
            Pages.find(Object.assign(findCriteria, {_id: {$gt: req.body.last_id}})).limit(req.body.number_of_records)
            .exec((err, pages) => {
              if (err) {
                return res.status(404).json({
                  status: 'failed',
                  description: `Error in getting pages ${JSON.stringify(err)}`
                })
              }
              Subscribers.aggregate([
                {$match: {isSubscribed: true}},
                {
                  $group: {
                    _id: {pageId: '$pageId'},
                    count: {$sum: 1}
                  }
                }], (err2, gotSubscribersCount) => {
                if (err2) {
                  return res.status(404).json({
                    status: 'failed',
                    description: `Error in getting pages subscriber count ${JSON.stringify(
                      err2)}`
                  })
                }
                Subscribers.aggregate([
                  {$match: {isSubscribed: false}},
                  {
                    $group: {
                      _id: {pageId: '$pageId'},
                      count: {$sum: 1}
                    }
                  }], (err2, gotUnSubscribersCount) => {
                  if (err2) {
                    return res.status(404).json({
                      status: 'failed',
                      description: `Error in getting pages subscriber count ${JSON.stringify(
                        err2)}`
                    })
                  }
                  let pagesPayload = []
                  for (let i = 0; i < pages.length; i++) {
                    pagesPayload.push({
                      _id: pages[i]._id,
                      pageId: pages[i].pageId,
                      pageName: pages[i].pageName,
                      userId: pages[i].userId,
                      pagePic: pages[i].pagePic,
                      connected: pages[i].connected,
                      pageUserName: pages[i].pageUserName,
                      likes: pages[i].likes,
                      isWelcomeMessageEnabled: pages[i].isWelcomeMessageEnabled,
                      welcomeMessage: pages[i].welcomeMessage,
                      subscribers: 0,
                      unsubscribes: 0,
                      greetingText: pages[i].greetingText
                    })
                  }
                  for (let i = 0; i < pagesPayload.length; i++) {
                    for (let j = 0; j < gotSubscribersCount.length; j++) {
                      if (pagesPayload[i]._id.toString() ===
                        gotSubscribersCount[j]._id.pageId.toString()) {
                        pagesPayload[i].subscribers = gotSubscribersCount[j].count
                      }
                    }
                  }
                  for (let i = 0; i < pagesPayload.length; i++) {
                    for (let j = 0; j < gotUnSubscribersCount.length; j++) {
                      if (pagesPayload[i]._id.toString() ===
                        gotUnSubscribersCount[j]._id.pageId.toString()) {
                        pagesPayload[i].unsubscribes = gotUnSubscribersCount[j].count
                      }
                    }
                  }
                  res.status(200).json({
                    status: 'success',
                    payload: {pages: pagesPayload, count: pagesCount.length > 0 ? pagesCount[0].count : 0, last_id: pagesPayload.length > 0 ? pagesPayload[pagesPayload.length - 1]._id : ''}
                  })
                })
              })
            })
          })
        }
      } else if (req.body.first_page === 'previous') {
        let recordsToSkip = Math.abs(((req.body.requested_page) - (req.body.current_page - 1))) * req.body.number_of_records
        if (!req.body.filter) {
          Pages.aggregate([
            { $match: {connected: true, companyId: companyUser.companyId} },
            { $group: { _id: null, count: { $sum: 1 } } }
          ], (err, pagesCount) => {
            if (err) {
              return res.status(404)
                .json({status: 'failed', description: 'PagesCount not found'})
            }
            Pages.find({connected: true, companyId: companyUser.companyId, _id: {$lt: req.body.last_id}}).skip(recordsToSkip).limit(req.body.number_of_records)
            .exec((err, pages) => {
              if (err) {
                return res.status(404).json({
                  status: 'failed',
                  description: `Error in getting pages ${JSON.stringify(err)}`
                })
              }
              Subscribers.aggregate([
                {$match: {isSubscribed: true}},
                {
                  $group: {
                    _id: {pageId: '$pageId'},
                    count: {$sum: 1}
                  }
                }], (err2, gotSubscribersCount) => {
                if (err2) {
                  return res.status(404).json({
                    status: 'failed',
                    description: `Error in getting pages subscriber count ${JSON.stringify(
                      err2)}`
                  })
                }
                Subscribers.aggregate([
                  {$match: {isSubscribed: false}},
                  {
                    $group: {
                      _id: {pageId: '$pageId'},
                      count: {$sum: 1}
                    }
                  }], (err2, gotUnSubscribersCount) => {
                  if (err2) {
                    return res.status(404).json({
                      status: 'failed',
                      description: `Error in getting pages subscriber count ${JSON.stringify(
                        err2)}`
                    })
                  }
                  let pagesPayload = []
                  for (let i = 0; i < pages.length; i++) {
                    pagesPayload.push({
                      _id: pages[i]._id,
                      pageId: pages[i].pageId,
                      pageName: pages[i].pageName,
                      userId: pages[i].userId,
                      pagePic: pages[i].pagePic,
                      connected: pages[i].connected,
                      pageUserName: pages[i].pageUserName,
                      likes: pages[i].likes,
                      isWelcomeMessageEnabled: pages[i].isWelcomeMessageEnabled,
                      welcomeMessage: pages[i].welcomeMessage,
                      subscribers: 0,
                      unsubscribes: 0,
                      greetingText: pages[i].greetingText
                    })
                  }
                  for (let i = 0; i < pagesPayload.length; i++) {
                    for (let j = 0; j < gotSubscribersCount.length; j++) {
                      if (pagesPayload[i]._id.toString() ===
                        gotSubscribersCount[j]._id.pageId.toString()) {
                        pagesPayload[i].subscribers = gotSubscribersCount[j].count
                      }
                    }
                  }
                  for (let i = 0; i < pagesPayload.length; i++) {
                    for (let j = 0; j < gotUnSubscribersCount.length; j++) {
                      if (pagesPayload[i]._id.toString() ===
                        gotUnSubscribersCount[j]._id.pageId.toString()) {
                        pagesPayload[i].unsubscribes = gotUnSubscribersCount[j].count
                      }
                    }
                  }
                  res.status(200).json({
                    status: 'success',
                    payload: {pages: pagesPayload, count: pagesCount.length > 0 ? pagesCount[0].count : 0, last_id: pagesPayload.length > 0 ? pagesPayload[pagesPayload.length - 1]._id : ''}
                  })
                })
              })
            })
          })
        } else {
          let search = new RegExp('.*' + req.body.filter_criteria.search_value + '.*', 'i')
          let findCriteria = {
            connected: true,
            companyId: companyUser.companyId,
            pageName: req.body.filter_criteria.search_value !== '' ? {$regex: search} : {$exists: true}
          }
          Pages.aggregate([
            { $match: findCriteria },
            { $group: { _id: null, count: { $sum: 1 } } }
          ], (err, pagesCount) => {
            if (err) {
              return res.status(404)
                .json({status: 'failed', description: 'PagesCount not found'})
            }
            Pages.find(Object.assign(findCriteria, {_id: {$lt: req.body.last_id}})).limit(req.body.number_of_records)
            .exec((err, pages) => {
              if (err) {
                return res.status(404).json({
                  status: 'failed',
                  description: `Error in getting pages ${JSON.stringify(err)}`
                })
              }
              Subscribers.aggregate([
                {$match: {isSubscribed: true}},
                {
                  $group: {
                    _id: {pageId: '$pageId'},
                    count: {$sum: 1}
                  }
                }], (err2, gotSubscribersCount) => {
                if (err2) {
                  return res.status(404).json({
                    status: 'failed',
                    description: `Error in getting pages subscriber count ${JSON.stringify(
                      err2)}`
                  })
                }
                Subscribers.aggregate([
                  {$match: {isSubscribed: false}},
                  {
                    $group: {
                      _id: {pageId: '$pageId'},
                      count: {$sum: 1}
                    }
                  }], (err2, gotUnSubscribersCount) => {
                  if (err2) {
                    return res.status(404).json({
                      status: 'failed',
                      description: `Error in getting pages subscriber count ${JSON.stringify(
                        err2)}`
                    })
                  }
                  let pagesPayload = []
                  for (let i = 0; i < pages.length; i++) {
                    pagesPayload.push({
                      _id: pages[i]._id,
                      pageId: pages[i].pageId,
                      pageName: pages[i].pageName,
                      userId: pages[i].userId,
                      pagePic: pages[i].pagePic,
                      connected: pages[i].connected,
                      pageUserName: pages[i].pageUserName,
                      likes: pages[i].likes,
                      isWelcomeMessageEnabled: pages[i].isWelcomeMessageEnabled,
                      welcomeMessage: pages[i].welcomeMessage,
                      subscribers: 0,
                      unsubscribes: 0,
                      greetingText: pages[i].greetingText
                    })
                  }
                  for (let i = 0; i < pagesPayload.length; i++) {
                    for (let j = 0; j < gotSubscribersCount.length; j++) {
                      if (pagesPayload[i]._id.toString() ===
                        gotSubscribersCount[j]._id.pageId.toString()) {
                        pagesPayload[i].subscribers = gotSubscribersCount[j].count
                      }
                    }
                  }
                  for (let i = 0; i < pagesPayload.length; i++) {
                    for (let j = 0; j < gotUnSubscribersCount.length; j++) {
                      if (pagesPayload[i]._id.toString() ===
                        gotUnSubscribersCount[j]._id.pageId.toString()) {
                        pagesPayload[i].unsubscribes = gotUnSubscribersCount[j].count
                      }
                    }
                  }
                  res.status(200).json({
                    status: 'success',
                    payload: {pages: pagesPayload, count: pagesCount.length > 0 ? pagesCount[0].count : 0, last_id: pagesPayload.length > 0 ? pagesPayload[pagesPayload.length - 1]._id : ''}
                  })
                })
              })
            })
          })
        }
      }
    })
}

exports.enable = function (req, res) {
  CompanyProfile.findOne({ownerId: req.user._id}, (err, companyProfile) => {
    if (err) {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    }
    PlanUsage.findOne({planId: companyProfile.planId}, (err, planUsage) => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
      CompanyUsage.findOne({companyId: companyProfile._id}, (err, companyUsage) => {
        if (err) {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error ${JSON.stringify(err)}`
          })
        }
        if (planUsage.facebook_pages !== -1 && companyUsage.facebook_pages >= planUsage.facebook_pages) {
          return res.status(500).json({
            status: 'failed',
            description: `Your pages limit has reached. Please upgrade your plan to premium in order to connect more pages.`
          })
        }
        Pages.findOne({_id: req.body._id}, (err, userPage) => {
          if (err) {
            logger.serverLog(TAG, `Error ${JSON.stringify(err)}`)
            return res.status(500).json({
              status: 'failed',
              description: `Internal Server Error ${JSON.stringify(err)}`
            })
          }
          if (userPage && userPage.userId) {
            Users.findOne({_id: userPage.userId}, (err, connectedUser) => {
              if (err) {
                return res.status(500).json({
                  status: 'failed',
                  description: `Internal Server Error ${JSON.stringify(err)}`
                })
              }
              var currentUser
              if (req.user.facebookInfo) {
                currentUser = req.user
              } else {
                currentUser = connectedUser
              }
              if (currentUser.facebookInfo) {
                needle.get(
                  `https://graph.facebook.com/v2.10/${req.body.pageId}?fields=is_published&access_token=${currentUser.facebookInfo.fbToken}`,
                  (err, resp) => {
                    if (err) {
                      logger.serverLog(TAG,
                        `Page access token from graph api error ${JSON.stringify(
                          err)}`)
                    }
                    if (resp.body.is_published === false) {
                      return res.status(404).json({
                        status: 'failed',
                        description: 'not published'
                      })
                    } else {
                      // check if page is already connected by some other user
                      // short term solution for issue Subscribers list is not updating (multi user issue) #307
                      CompanyUsers.findOne({domain_email: req.user.domain_email},
                        (err, companyUser) => {
                          if (err) {
                            return res.status(500).json({
                              status: 'failed',
                              description: `Internal Server Error ${JSON.stringify(err)}`
                            })
                          }
                          if (!companyUser) {
                            return res.status(404).json({
                              status: 'failed',
                              description: 'The user account does not belong to any company. Please contact support'
                            })
                          }
                          Pages.find(
                            {pageId: req.body.pageId, connected: true},
                            (err, pagesbyOther) => {
                              if (err) {
                                res.status(500).json({
                                  status: 'Failed',
                                  description: 'Failed to update record'
                                })
                              }
                              if (pagesbyOther.length === 0) {
                                Pages.update({_id: req.body._id},
                                  {
                                    connected: true,
                                    isWelcomeMessageEnabled: true,
                                    welcomeMessage: [
                                      {
                                        id: 0,
                                        componentType: 'text',
                                        text: 'Hi {{user_full_name}}! Thanks for getting in touch with us on Messenger. Please send us any questions you may have'
                                      }]
                                  }, {multi: true}, (err) => {
                                    if (err) {
                                      res.status(500).json({
                                        status: 'Failed',
                                        error: err,
                                        description: 'Failed to update record'
                                      })
                                    } else {
                                      CompanyUsage.update({companyId: companyUser.companyId},
                                        { $inc: { facebook_pages: 1 } }, (err, updated) => {
                                          if (err) {
                                            logger.serverLog(TAG, `ERROR ${JSON.stringify(err)}`)
                                          }
                                        })
                                      Subscribers.update({pageId: req.body._id},
                                        {isEnabledByPage: true}, {multi: true},
                                        function (err) {
                                          if (err) {
                                            res.status(500).json({
                                              status: 'Failed',
                                              description: 'Failed to update record'
                                            })
                                          }
                                          Pages.find({
                                            userId: req.user._id,
                                            companyId: companyUser.companyId
                                          }, (err2, pages) => {
                                            if (err2) {
                                              return res.status(500).json({
                                                status: 'failed',
                                                description: `Internal Server Error${JSON.stringify(
                                                  err)}`
                                              })
                                            }
                                            Pages.find({
                                              companyId: companyUser.companyId,
                                              connected: true
                                            }, (err, connectedPages) => {
                                              if (err) {
                                                return res.status(500)
                                                  .json({status: 'failed', description: err})
                                              }
                                              for (let a = 0; a <
                                              connectedPages.length; a++) {
                                                for (let b = 0; b < pages.length; b++) {
                                                  if (connectedPages[a].pageId ===
                                                    pages[b].pageId) {
                                                    pages[b].connected = true
                                                  }
                                                }
                                              }
                                              const options = {
                                                url: `https://graph.facebook.com/v2.6/${req.body.pageId}/subscribed_apps?access_token=${req.body.accessToken}`,
                                                qs: {access_token: req.body.accessToken},
                                                method: 'POST'
                                              }
                                              var valueForMenu = {
                                                'get_started': {
                                                  'payload': '<GET_STARTED_PAYLOAD>'
                                                },
                                                'greeting': [
                                                  {
                                                    'locale': 'default',
                                                    'text': 'Hi {{user_full_name}}! Please tap on getting started to start the conversation.'
                                                  }]
                                              }
                                              const requesturl = `https://graph.facebook.com/v2.6/me/messenger_profile?access_token=${req.body.accessToken}`

                                              needle.request('post', requesturl, valueForMenu,
                                                {json: true}, function (err, resp) {
                                                  if (!err) {
                                                  }
                                                  if (err) {
                                                    logger.serverLog(TAG,
                                                      `Internal Server Error ${JSON.stringify(
                                                        err)}`)
                                                  }
                                                })
                                              needle.post(options.url, options,
                                                (error, response) => {
                                                  if (error) {
                                                    return res.status(500).json(
                                                      {
                                                        status: 'failed',
                                                        description: JSON.stringify(error)
                                                      })
                                                  }
                                                  require('./../../../config/socketio')
                                                    .sendMessageToClient({
                                                      room_id: companyUser.companyId,
                                                      body: {
                                                        action: 'page_connect',
                                                        payload: {
                                                          page_id: req.body.pageId,
                                                          user_id: req.user._id,
                                                          user_name: req.user.name,
                                                          company_id: companyUser.companyId
                                                        }
                                                      }
                                                    })
                                                  res.status(200)
                                                    .json({
                                                      status: 'success',
                                                      payload: {pages: pages}
                                                    })
                                                })
                                            })
                                          })
                                        })
                                    }
                                  })
                              } else {
                                // page is already connected by someone else
                                Pages.find(
                                  {userId: req.user._id, companyId: companyUser.companyId},
                                  (err2, pages) => {
                                    if (err2) {
                                      return res.status(500).json({
                                        status: 'failed',
                                        description: `Internal Server Error${JSON.stringify(
                                          err)}`
                                      })
                                    }
                                    Users.findOne({_id: pagesbyOther[0].userId},
                                    (err, userInfo) => {
                                      if (err) {
                                        return res.status(500).json({
                                          status: 'failed',
                                          description: `Internal Server Error${JSON.stringify(
                                            err)}`
                                        })
                                      }
                                      let msg = 'Page is already connected'
                                      if (userInfo && userInfo.facebookInfo) {
                                        msg = `Page is already connected by ${userInfo.facebookInfo.name}. In order to manage this page please ask ${userInfo.facebookInfo.name} to create a team account and invite you.`
                                      }
                                      res.status(200).json({
                                        status: 'success',
                                        payload: {
                                          pages: pages,
                                          msg: msg
                                        }
                                      })
                                    })
                                  })
                              }
                            })
                        })
                    }
                  })
              }
            })
          }
        })
      })
    })
  })
}

exports.disable = function (req, res) {
  CompanyUsers.findOne({domain_email: req.user.domain_email},
    (err, companyUser) => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      Pages.update({
        pageId: req.body.pageId,
        companyId: companyUser.companyId,
        connected: true
      },
        {connected: false}, {multi: true}, (err) => {
          if (err) {
            res.status(500).json({
              status: 'Failed',
              error: err,
              description: 'Failed to update record'
            })
          } else {
            CompanyUsage.update({companyId: companyUser.companyId},
              { $inc: { facebook_pages: -1 } }, (err, updated) => {
                if (err) {
                  logger.serverLog(TAG, `ERROR ${JSON.stringify(err)}`)
                }
              })
            // remove subscribers of the page
            Subscribers.update({pageId: req.body._id}, {isEnabledByPage: false},
              {multi: true}, (err) => {
                Subscribers.find({pageId: req.body._id}, (err, subscribers) => {
                  if (err) {
                    logger.serverLog(TAG,
                      `Error on fetching subscribers: ${err}`)
                    return res.status(404)
                      .json({
                        status: 'failed',
                        description: 'Subscribers not found'
                      })
                  }
                })
                Pages.find(
                  {companyId: companyUser.companyId},
                  (err2, pages) => {
                    if (err2) {
                      return res.status(500).json({
                        status: 'failed',
                        description: `Internal Server Error${JSON.stringify(
                          err)}`
                      })
                    }
                    pages = removeDuplicates(pages, 'pageId')
                    const options = {
                      url: `https://graph.facebook.com/v2.6/${req.body.pageId}/subscribed_apps?access_token=${req.body.accessToken}`,
                      qs: {access_token: req.body.accessToken},
                      method: 'DELETE'

                    }

                    needle.delete(options.url, options, (error, response) => {
                      if (error) {
                        return res.status(500)
                          .json({
                            status: 'failed',
                            description: JSON.stringify(error)
                          })
                      }
                      require('./../../../config/socketio').sendMessageToClient({
                        room_id: companyUser.companyId,
                        body: {
                          action: 'page_disconnect',
                          payload: {
                            page_id: req.body.pageId,
                            user_id: req.user._id,
                            user_name: req.user.name,
                            company_id: companyUser.companyId
                          }
                        }
                      })
                      Subscribers.aggregate([
                        {
                          $group: {
                            _id: {pageId: '$pageId'},
                            count: {$sum: 1}
                          }
                        }], (err2, gotSubscribersCount) => {
                        if (err2) {
                          return res.status(404).json({
                            status: 'failed',
                            description: `Error in getting pages subscriber count ${JSON.stringify(
                              err2)}`
                          })
                        }
                        Pages.find(
                          {companyId: companyUser.companyId, connected: true},
                          (err, connectedPages) => {
                            if (err) {
                              return res.status(500)
                                .json({status: 'failed', description: err})
                            }
                            for (let a = 0; a < connectedPages.length; a++) {
                              for (let b = 0; b < pages.length; b++) {
                                if (connectedPages[a].pageId ===
                                  pages[b].pageId) {
                                  pages[b].connected = true
                                }
                              }
                            }
                            let pagesPayload = []
                            for (let i = 0; i < pages.length; i++) {
                              pagesPayload.push({
                                _id: pages[i]._id,
                                pageId: pages[i].pageId,
                                pageName: pages[i].pageName,
                                userId: pages[i].userId,
                                pagePic: pages[i].pagePic,
                                connected: pages[i].connected,
                                pageUserName: pages[i].pageUserName,
                                likes: pages[i].likes,
                                subscribers: 0
                              })
                            }
                            for (let i = 0; i < pagesPayload.length; i++) {
                              for (let j = 0; j <
                              gotSubscribersCount.length; j++) {
                                if (pagesPayload[i]._id.toString() ===
                                  gotSubscribersCount[j]._id.pageId.toString()) {
                                  pagesPayload[i].subscribers = gotSubscribersCount[j].count
                                }
                              }
                            }
                            res.status(200).json({
                              status: 'success',
                              payload: pagesPayload
                            })
                          })
                      })
                      //  res.status(200).json({status: 'success', payload: pages})
                    })
                  })
              })
          }
        })
    })
}

function removeDuplicates (myArr, prop) {
  return myArr.filter((obj, pos, arr) => {
    return arr.map(mapObj => mapObj[prop]).indexOf(obj[prop]) === pos
  })
}

exports.otherPages = function (req, res) {
  CompanyUsers.findOne({domain_email: req.user.domain_email},
    (err, companyUser) => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      Pages.find({
        connected: false,
        userId: req.user._id,
        companyId: companyUser.companyId
      }, (err, pages) => {
        if (err) {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error ${JSON.stringify(
              err)}`
          })
        }
        return res.status(200).json({status: 'success', payload: pages})
      })
    })
}

function exists (list, content) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].pageId === content) {
      return true
    }
  }
  return false
}

exports.addPages = function (req, res) {
  CompanyUsers.findOne({domain_email: req.user.domain_email},
    (err, companyUser) => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      Pages.find({companyId: companyUser.companyId}, (err, pages) => {
        if (err) {
          return res.status(500).json({status: 'failed', description: err})
        }
        Pages.find({companyId: companyUser.companyId, connected: true},
          (err, connectedPages) => {
            if (err) {
              return res.status(500)
                .json({status: 'failed', description: err})
            }
            for (let a = 0; a < connectedPages.length; a++) {
              for (let b = 0; b < pages.length; b++) {
                if (connectedPages[a].pageId === pages[b].pageId) {
                  pages[b].connected = true
                }
              }
            }
            let pagesSend = []
            for (let i = 0; i < pages.length; i++) {
              if (exists(pagesSend, pages[i].pageId) === false) {
                pagesSend.push(pages[i])
              }
            }
            res.status(201).json({status: 'success', payload: pagesSend})
          })
      })
      //  return res.status(200).json({ status: 'success', payload: user});
    })
}
exports.createWelcomeMessage = function (req, res) {
  Pages.update({_id: req.body._id, connected: true},
    {welcomeMessage: req.body.welcomeMessage}, (err) => {
      if (err) {
        res.status(500).json({
          status: 'Failed',
          error: err,
          description: 'Failed to update record'
        })
      }
      res.status(201).json({status: 'success', payload: req.body})
    })
}
exports.isWelcomeMessageEnabled = function (req, res) {
  Pages.update({_id: req.body._id, connected: true},
    {isWelcomeMessageEnabled: req.body.isWelcomeMessageEnabled}, (err) => {
      if (err) {
        res.status(500).json({
          status: 'Failed',
          error: err,
          description: 'Failed to update record'
        })
      }
      res.status(201).json({status: 'success', payload: req.body})
    })
}

exports.saveGreetingText = function (req, res) {
  CompanyUsers.findOne({domain_email: req.user.domain_email},
    (err, companyUser) => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error ${JSON.stringify(err)}`
        })
      }
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      Pages.update({pageId: req.body.pageId, companyId: companyUser.companyId},
        {greetingText: req.body.greetingText}, {multi: true}, (err) => {
          if (err) {
            res.status(500).json({
              status: 'Failed',
              error: err,
              description: 'Failed to update record'
            })
          }
          var valueForMenu = {
            'greeting': [
              {
                'locale': 'default',
                'text': req.body.greetingText
              }]
          }
          Pages.findOne(
            {pageId: req.body.pageId, companyId: companyUser.companyId},
            (err, page) => {
              if (err) {
                res.status(500).json({
                  status: 'Failed',
                  description: err
                })
              }
              const requesturl = `https://graph.facebook.com/v2.6/me/messenger_profile?access_token=${page.accessToken}`

              needle.request('post', requesturl, valueForMenu, {json: true},
                function (err, resp) {
                  if (!err) {
                  }
                  if (err) {
                    logger.serverLog(TAG,
                      `Internal Server Error ${JSON.stringify(err)}`)
                  }
                })
            })
          res.status(201).json({status: 'success', payload: req.body})
        })
    })
}
