const utility = require('../utility')
const logicLayer = require('./landingPage.logiclayer')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      utility.callApi(`landingPage/query`, 'post', {companyId: companyUser.companyId})
        .then(landingPages => {
          return res.status(200).json({status: 'success', payload: landingPages})
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to fetch landingPages ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
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
          return res.status(201).json({status: 'success', payload: landingPage})
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to create landingPage ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to create landingPageState ${(error)}`})
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
              return res.status(201).json({status: 'success', payload: landingPage})
            })
            .catch(error => {
              return res.status(500).json({status: 'failed', payload: `Failed to create landingPage ${JSON.stringify(error)}`})
            })
        }
        // }
        )
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to create landingPageState ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

exports.delete = function (req, res) {
  utility.callApi(`landingPage/query`, 'post', {_id: req.params.id, companyId: req.user.companyId})
    .then(landingPages => {
      let landingPage = landingPages[0]
      utility.callApi(`landingPage/landingPageState/${landingPage.initialState._id}`, 'delete', {})
        .then(result => {
          if (landingPage.submittedState && landingPage.submittedState.state) {
            utility.callApi(`landingPage/landingPageState/${landingPage.submittedState.state._id}`, 'delete', {})
              .then(result => {
              })
              .catch(error => {
                return res.status(500).json({status: 'failed', payload: `Failed to delete landingPageState ${JSON.stringify(error)}`})
              })
          }
          utility.callApi(`landingPage/${req.params.id}`, 'delete', {})
            .then(result => {
              return res.status(200).json({status: 'success', payload: result})
            })
            .catch(error => {
              return res.status(500).json({status: 'failed', payload: `Failed to delete landingPage ${JSON.stringify(error)}`})
            })
        })
        .catch(error => {
          return res.status(500).json({status: 'failed', payload: `Failed to delete landingPageState ${JSON.stringify(error)}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to fetch landingPage ${JSON.stringify(error)}`})
    })
}
