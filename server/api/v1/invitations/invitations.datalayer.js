const InvitationsModel = require('./invitations.model')

exports.findOneInvitationObjectUsingQuery = (query) => {
  return InvitationsModel.findOne(query)
    .exec()
}

exports.removeInvitationObjectUsingQuery = (query) => {
  return InvitationsModel.remove(query)
    .exec()
}
