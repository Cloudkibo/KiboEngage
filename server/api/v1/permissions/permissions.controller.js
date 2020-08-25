const utility = require('../utility')
const logicLayer = require('./permissions.logiclayer')

exports.updatePermissions = function (req, res) {
  utility.callApi(`permissions/query`, 'post', { companyId: req.body.companyId, userId: req.body.userId }, req.headers.authorization)
    .then(permission => {
      permission = logicLayer.setPermissions(req.body)
      utility.callApi(`permissions/${permission._id}`, 'put', permission, req.headers.authorization)
        .then(result => {
          res.status(201).json({status: 'success', payload: result})
        })
        .catch(error => {
          res.status(500).json({
            status: 'failed',
            description: error
          })
        })
    })
    .catch(error => {
      res.status(500).json({status: 'failed', description: error})
    })
}

exports.changePermissions = function (req, res) {
  utility.callApi(`permissions/genericUpdate`, 'post',{query:{companyId: req.user.companyId, userId: req.user._id}, newPayload:req.body.payload, options: {upsert: true}}, 'accounts',  req.headers.authorization)
    .then(result => {
      res.status(200).json({status: 'success', payload: 'Changes updated successfully'})
    })
    .catch(error => {
      res.status(500).json({status: 'failed', description: error})
    })
}

exports.fetchUserPermissions = function (req, res) {
  utility.callApi(`permissions/query`, 'post', {companyId: req.user.companyId, userId: req.user._id})
    .then(userPermission => {
      if (userPermission.length > 0) {
        userPermission = userPermission[0]
      }
      res.status(200).json({
        status: 'success',
        payload: userPermission
      })
    })
    .catch(error => {
      res.status(500).json({
        status: 'failed',
        description: `Unable to fetch user permission ${JSON.stringify(error)}`
      })
    })
}
