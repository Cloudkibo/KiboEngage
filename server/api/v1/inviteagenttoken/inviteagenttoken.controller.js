'use strict'

let Inviteagenttoken = require('./inviteagenttoken.model')
let Invitations = require('./../invitations/invitations.model')
let config = require('./../../../config/environment/index')
let path = require('path')

// eslint-disable-next-line no-unused-vars
const logger = require('../../../components/logger')
// eslint-disable-next-line no-unused-vars
const TAG = 'api/inviteagenttoken/inviteagenttoken.controller.js'

const InviteAgentTokenDataLayer = require('./inviteagenttoken.datalayer')
const InvitationsDataLayer = require('../invitations/invitations.datalayer')

exports.verify = function (req, res) {
    InviteAgentTokenDataLayer.findOneInviteAgentTokenUsingQuery({token: req.params.id})
        .then(verificationtoken => {
            if (!verificationtoken) {
                return res.sendFile(
                  path.join(config.root, 'client/pages/join_company_failed.html'))
              } else {
                  InvitationsDataLayer.findOneInvitationObjectUsingQuery({
                    email: verificationtoken.email,
                    companyId: verificationtoken.companyId
                  })
                  .then(invitation => {
                    if (!verificationtoken) {
                        return res.sendFile(
                          path.join(config.root, 'client/pages/join_company_failed.html'))
                      }
                      res.cookie('email', verificationtoken.email,
                        {expires: new Date(Date.now() + 900000)})
                      res.cookie('name', invitation.name,
                        {expires: new Date(Date.now() + 900000)})
                      res.cookie('companyId', verificationtoken.companyId,
                        {expires: new Date(Date.now() + 900000)})
                      res.cookie('companyName', verificationtoken.companyName,
                        {expires: new Date(Date.now() + 900000)})
                      res.cookie('domain', verificationtoken.domain,
                        {expires: new Date(Date.now() + 900000)})
                      return res.sendFile(
                        path.join(config.root, 'client/pages/join_company_success.html'))
                  })
                  .catch(err => {
                    return res.status(500)
                    .json({status: 'failed', description: 'Internal Server Error'})
                  })
              }
        })
        .catch(err => {
            return res.status(500)
                .json({status: 'failed', description: 'Internal Server Error'})
        })
}
