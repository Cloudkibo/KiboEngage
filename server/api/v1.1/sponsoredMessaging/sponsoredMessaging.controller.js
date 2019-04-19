const utility = require('../utility')
const logiclayer = require('./sponsoredMessaging.logiclayer')
const {facebookApiCaller} = require('../../global/facebookApiCaller')
const {marketingApiAccessToken} = require('../../../config/environment')

exports.index = function(req,res){
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      utility.callApi(`sponsoredmessaging/query`, 'get', {companyId: companyUser.companyId}, req.headers.authorization)
      .then(sponsoredMessages => {
        return res.status(200).json({status: 'success', payload: sponsoredMessages})
      })
      .catch(error => {
        return res.status(500).json({status: 'failed', payload: `Failed to fetch sponsoredMessages ${JSON.stringify(error)}`})
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

exports.update = function (req, res) {
  let updatePayload = logiclayer.prepareUpdatePayload(req.body)
  utility.callApi(`sponsoredMessaging/${req.body._id}`, 'post', updatePayload, req.headers.authorization)
    .then(sponsoredMessage => {
      return res.status(201).json({status: 'success', payload: sponsoredMessage})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to create sponsored message ${JSON.stringify(error)}`})
    })
}

exports.send = function (req, res) {
  const accesstoken = marketingApiAccessToken
  let id = req.params.id
  console.log('id', id)

  if (id !== undefined && id !== '') {
    utility.callApi(`sponsoredMessaging/query`, 'get', {_id:id}, req.headers.authorization)
      .then(sponsoredMessages => {
        let sponsoredMessage = sponsoredMessages[0]
        let campaignPayload = logiclayer.prepareCampaignPayload(sponsoredMessage, accesstoken)
        console.log('campaign paylaod', campaignPayload)
        facebookApiCaller('v3.1', `act_${req.body.ad_account_id}/campaigns`, 'post', campaignPayload)
          .then(resp => {
            let campaignId = resp.body.id
            console.log('campaign id', resp.body)
            let adsetPayload = logiclayer.prepareAdsetPayload(sponsoredMessage, campaignId, accesstoken)
            console.log('adsetPayload', adsetPayload)
            facebookApiCaller('v3.1', `act_${req.body.ad_account_id}/adsets`, 'post', adsetPayload)
              .then(response => {
                let adsetid = response.body.id
                console.log('adset', adsetid)
                /// //////////
                let updatePayload = logiclayer.prepareUpdatePayload(sponsoredMessage, campaignId, adsetid)
                console.log('updatePayload', updatePayload)
                utility.callApi(`sponsoredMessaging/${req.body._id}`, 'post', updatePayload, req.headers.authorization)
                  .then(sponsoredMessage => {
                    return res.status(201).json({status: 'success', payload: sponsoredMessage})
                  })
                  .catch(error => {
                    return res.status(500).json({status: 'failed', payload: `Failed to create sponsored message ${JSON.stringify(error)}`})
                  })
              })
              /// /////
              // logiclayer.prepareadCreativePayload(sponsoredMessage,accesstoken)
              // .then(creativePayload => {
              //   facebookApiCaller('v3.1',`act_${req.body.ad_account_id}/adcreatives`,'post',creativePayload)
              //   .then(resp => {
              //   let message_creative_id = resp.id
              //   logiclayer.prepareadAdPayload(sponsoredMessage,adsetid,message_creative_id,accesstoken)
              //   .then(adPayload => {
              //     facebookApiCaller('v3.1',`act_${req.body.ad_account_id}/ads`,'post',adPayload)
              //     .then(resp => {
              //     let ad_id = resp.id
              //     //Now since we have got respone from facebook, we shall update our database
              //     let updatePayload = logiclayer.prepareUpdatePayload({campaign_id: campaignId, ad_id: ad_id, ad_set_payload: {adset_id: adsetid}, message_creative_id:message_creative_id})
              //       utility.callApi( `sponsoredMessaging/${req.body._id}`,'post',updatePayload, req.headers.authorization)
              //       .then(sponsoredMessage => {
              //       return res.status(201).json({status: 'success', payload: sponsoredMessage})
              //       })
              //       .catch(error => {
              //       return res.status(500).json({status: 'failed', payload: `Failed to create sponsored message ${JSON.stringify(error)}`})
              //       })
              //       })
              //       .catch(err => {
              //       return res.status(500).json({status:'failed', payload: err})
              //       })
              //       })
              //     .catch(err => {
              //       return res.status(500).json({status:'failed', payload: err})
              //     })
              //   })
              //   .catch(err => {
              //     return res.status(500).json({status:'failed', payload: err})
              // })
              // })
          })
          .catch(error => {
            return res.status(500).json({status: 'failed', payload: error})
          })

          .catch(error => {
            return res.status(500).json({status: 'failed', payload: error})
          })
      })
  } else {
    return res.status(500).json({status: 'failed', payload: 'Failed to send sponsored message due to id'})
  }
}

exports.delete = function (req, res) {
  utility.callApi(`sponsoredMessaging/${req.params._id}`, 'DELETE', {}, req.headers.authorization)
    .then(sponsoredMessage => {
      return res.status(201).json({status: 'success', payload: sponsoredMessage})
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to delete sponsored message ${error}`})
    })
}
