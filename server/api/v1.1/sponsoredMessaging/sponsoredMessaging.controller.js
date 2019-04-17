const utility = require('../utility')
const logiclayer = require('./sponsoredMessaging.logiclayer')


exports.create = function(req,res){
    utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
    

    let payload = logiclayer.preparePayload(companyUser.companyId, req.user._id)
        utility.callApi(`sponsoredMessaging`, 'post', payload, req.headers.authorization)
        .then(sponsoredMessage => {
          return res.status(201).json({status: 'success', payload: sponsoredMessage})
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to create sponsored message ${JSON.stringify(error)}`})
        })
      })
    }

exports.update = function(req,res){

  let updatePayload = logiclayer.prepareUpdatePayload(req.body)
  utility.callApi( `sponsoredMessaging/${req.body._id}`,'post',updatePayload, req.headers.authorization)
  .then(sponsoredMessage => {
    return res.status(201).json({status: 'success', payload: sponsoredMessage})
  })
  .catch(error => {
    return res.status(500).json({status: 'failed', payload: `Failed to create sponsored message ${JSON.stringify(error)}`})
  })
}

exports.delete = function (req, res) {

  utility.callApi( `sponsoredMessaging/${req.params._id}`,'DELETE', {}, req.headers.authorization)
  .then(sponsoredMessage => {
    return res.status(201).json({status: 'success', payload: sponsoredMessage})
  })
  .catch(error => {
    return res.status(500).json({status: 'failed', payload: `Failed to delete sponsored message ${error}`})
  })
}