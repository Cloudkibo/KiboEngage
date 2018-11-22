const InvitationsModel = require('./invitations.model')

exports.findOneInvitationObjectUsingQuery = (query) => {
  return InvitationsModel.findOne(query)
    .exec()
}
exports.findInvitationsUsingQuery = (query) => {
  return InvitationsModel.find(query)
    .exec()
}
exports.removeInvitationObjectUsingQuery = (query) => {
    return InvitationsModel.remove(query)
      .exec()
  }
