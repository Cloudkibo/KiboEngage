

const logger = require('../../../components/logger')
const TAG = 'api/invitations/invitations.controller.js'
const InvitationsDataLayer = require('./invitations.datalayer.js')
const InviteAgentTokenDataLayer = require('../inviteagenttoken/inviteagenttoken.datalayer')
const callApi = require('..')

exports.index = function (req, res) {
  callApi.callApi('companyuser/query', post, {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      IpCountryDataLayer.findOneInvitationObjectUsingQuery({companyId: companyUser.companyId})
        .then(invitations => {
          res.status(200).json({
            status: 'success',
            payload: invitations
          })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error ${JSON.stringify(err)}`
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

exports.cancel = function (req, res) {
  callApi.callApi('companyuser/query', post, {domain_email: req.user.domain_email})
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      InvitationsDataLayer.removeInvitationObjectUsingQuery({email: req.body.email, companyId: companyUser.companyId})
        .then(() => {
          InviteAgentTokenDataLayer.removeInviteAgentTokenUsingQuery({email: req.body.email, companyId: companyUser.companyId})
          .then(() => {
            res.status(200).json({
              status: 'success',
              description: 'Invitation has been cancelled.'
            })
          })
          .catch(err => {
            return res.status(500).json({
              status: 'failed',
              description: `Internal Server Error ${JSON.stringify(err)}`
            })
          })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error ${JSON.stringify(err)}`
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
