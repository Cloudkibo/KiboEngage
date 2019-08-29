const { callApi } = require('../v1.1/utility')
const logger = require('../../components/logger')
const TAG = 'api/global/messageStatistics.js'
let redis = require('redis')
let client

function findAllKeys (fn) {
  client.keys('*', (err, objs) => {
    if (err) {
      return fn(`error in message statistics find all keys ${JSON.stringify(err)}`)
    }
    if (objs && objs.length > 0) {
      let arrObjs = []
      for (let i = 0; i < objs.length; i++) {
        arrObjs.push(['get', objs[i]])
      }
      client.multi(arrObjs).exec(function (err, replies) {
        if (err) {
          return fn(`error in message statistics multi all keys ${JSON.stringify(err)}`)
        }
        fn(null, replies)
      })
    } else {
      fn(null, [])
    }
  })
}

exports.connectRedis = function () {
  client = redis.createClient()
  client.on('connect', () => {
    logger.serverLog(TAG, 'connected to redis', 'info')
    findAllKeys((err, data) => {
      if (err) {
        return console.log(err)
      }
      console.log(data)
    })
  })
  client.on('error', (err) => {
    logger.serverLog(TAG, 'unable connected to redis ' + JSON.stringify(err), 'info')
  })
}

function recordRedis (featureName) {
  findRedisObject(featureName, (err, record) => {
    if (err) {
      return logger.serverLog(TAG, `error in message statistics ${JSON.stringify(err)}`)
    }
    if (!record) {
      createRedisObject(featureName)
    } else {
      incrementRedisObject(featureName)
    }
  })
}

exports.recordRedis = recordRedis

function createRedisObject (featureName) {
  let today = new Date()
  let minutes = today.getMinutes()
  let hours = today.getHours()
  let day = today.getDate()
  let month = (today.getMonth() + 1)
  let year = today.getFullYear()
  let key = featureName + '-' + year + ':' + month + ':' + day + ':' + hours + ':' + minutes
  client.set(key, 0)
}

function incrementRedisObject (featureName) {
  let today = new Date()
  let minutes = today.getMinutes()
  let hours = today.getHours()
  let day = today.getDate()
  let month = (today.getMonth() + 1)
  let year = today.getFullYear()
  let key = featureName + '-' + year + ':' + month + ':' + day + ':' + hours + ':' + minutes
  client.incr(key)
}

function findRedisObject (featureName, cb) {
  let today = new Date()
  let minutes = today.getMinutes()
  let hours = today.getHours()
  let day = today.getDate()
  let month = (today.getMonth() + 1)
  let year = today.getFullYear()
  let key = featureName + '-' + year + ':' + month + ':' + day + ':' + hours + ':' + minutes
  client.get(key, (err, obj) => {
    if (err) {
      return cb(err)
    }
    cb(null, obj)
  })
}

// todo will remove this part
exports.record = function (featureName) {
  recordRedis(featureName)
//   findRecord(featureName, (err, record) => {
//     if (err) {
//       return logger.serverLog(TAG, `error in message statistics ${JSON.stringify(err)}`)
//     }
//     if (!record) {
//       createNewRecord(featureName)
//     } else {
//       incrementRecord(featureName)
//     }
//   })
}

function createNewRecord (featureName) {
  let today = new Date()
  let payload = { featureName }
  payload.day = today.getDate()
  payload.month = (today.getMonth() + 1)
  payload.year = today.getFullYear()
  payload.messageCount = 1
  callApi('messageStatistics', 'post', payload, 'kiboengage', '')
    .then(saved => {
      logger.serverLog(TAG, 'Message Statistics created successfully!')
    })
    .catch(err => console.log(TAG, `error in message statistics create ${JSON.stringify(err)}`))
}

function incrementRecord (featureName) {
  let today = new Date()
  let payload = { featureName }
  payload.day = today.getDate()
  payload.month = (today.getMonth() + 1)
  payload.year = today.getFullYear()
  let query = {
    purpose: 'updateOne',
    match: payload,
    updated: { $inc: { messageCount: 1 } }
  }
  callApi(`messageStatistics`, 'put', query, 'kiboengage')
    .then(updated => {
      logger.serverLog(TAG, 'Message Statistics updated successfully!')
    })
    .catch(err => logger.serverLog(TAG, `error in message statistics create ${JSON.stringify(err)}`))
}

function findRecord (featureName, cb) {
  let today = new Date()
  let payload = { featureName }
  payload.day = today.getDate()
  payload.month = (today.getMonth() + 1)
  payload.year = today.getFullYear()
  let query = {
    purpose: 'findOne',
    match: payload
  }
  callApi(`messageStatistics/query`, 'post', query, 'kiboengage')
    .then(found => {
      cb(null, found)
      logger.serverLog(TAG, 'Message Statistics fetched successfully!')
    })
    .catch(err => cb(err))
}
