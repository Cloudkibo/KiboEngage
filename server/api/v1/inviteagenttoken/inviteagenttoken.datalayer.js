const InviteAgentTokenModel = require('./inviteagenttoken.model')

exports.findOneInviteAgentTokenUsingQuery = (query) => {
  return InviteAgentTokenModel.findOne(query)
    .exec()
}

exports.removeInviteAgentTokenUsingQuery = (query) => {
    return InviteAgentTokenModel.remove(query)
      .exec()
  }