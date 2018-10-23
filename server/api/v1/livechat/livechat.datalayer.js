const LiveChatModel = require('./livechat.model')

exports.countLiveChat = (query) => {
  return LiveChatModel.count(query)
    .exec()
}