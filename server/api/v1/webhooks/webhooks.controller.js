const utility = require('../utility')
const needle = require('needle')

exports.index = function (req, res) {
  utility.callApi(`companyUser/${req.user.domain_email}`) // fetch company user
  .then(companyUser => {
    utility.callApi(`webhooks/query`, 'post', {companyId: companyUser.companyId})
    .then(webhooks => {
      return res.status(201).json({status: 'success', payload: webhooks})
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch webhooks ${JSON.stringify(error)}`
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

exports.create = function (req, res) {
  utility.callApi(`companyUser/${req.user.domain_email}`) // fetch company user
  .then(companyUser => {
    utility.callApi(`webhooks/query`, 'post', {companyId: companyUser.companyId, pageId: req.body.pageId})
    .then(webhooks => {
      if (webhooks && webhooks.length > 0) {
        return res.status(403).json({status: 'failed', description: 'Webhook for this page is already set'})
      } else {
        var url = req.body.webhook_url + '?token=' + req.body.token
        needle.get(url, (err, r) => {
          if (err) {
            return res.status(404).json({status: 'failed', description: 'This URL contains an invalid domain or the server at the given URL is not live.'})
          }
          if (r.statusCode === 200) {
            utility.callApi(`webhooks`, 'post', {
              webhook_url: req.body.webhook_url,
              companyId: companyUser.companyId,
              userId: req.user._id,
              isEnabled: true,
              optIn: req.body.optIn,
              pageId: req.body.pageId
            })
            .then(createdWebhook => {
              return res.status(201).json({status: 'success', payload: createdWebhook})
            })
            .catch(error => {
              return res.status(500).json({
                status: 'failed',
                payload: `Failed to create webhook ${JSON.stringify(error)}`
              })
            })
          } else {
            return res.status(404).json({status: 'failed', description: 'This URL contains an invalid domain or the server at the given URL is not live.'})
          }
        })
      }
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch webhook ${JSON.stringify(error)}`
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

exports.edit = function (req, res) {
  var url = req.body.webhook_url + '?token=' + req.body.token
  needle.get(url, (err, r) => {
    if (err) {
      return res.status(404).json({status: 'failed', description: 'This URL contains an invalid domain or the server at the given URL is not live.'})
    }
    if (r.statusCode === 200) {
      utility.callApi(`webhooks/${req.body._id}`, 'put', {
        webhook_url: req.body.webhook_url,
        optIn: req.body.optIn,
        userId: req.user._id})
      .then(edited => {
        res.status(201).json({status: 'success', payload: edited})
      })
      .catch(error => {
        return res.status(500).json({
          status: 'failed',
          payload: `Failed to update webhook ${JSON.stringify(error)}`
        })
      })
    } else {
      return res.status(404).json({status: 'failed', description: 'This URL contains an invalid domain or the server at the given URL is not live.'})
    }
  })
}

exports.isEnabled = function (req, res) {
  utility.callApi(`webhooks/${req.body._id}`, 'put', {isEnabled: req.body.isEnabled})
  .then(edited => {
    res.status(201).json({status: 'success', payload: edited})
  })
  .catch(error => {
    return res.status(500).json({
      status: 'failed',
      payload: `Failed to update webhook ${JSON.stringify(error)}`
    })
  })
}
