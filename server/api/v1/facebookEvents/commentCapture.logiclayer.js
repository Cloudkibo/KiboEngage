exports.getSendValue = function (post, body) {
  let send = true
  if (body.entry[0].changes[0].value.message) {
    if (post.includedKeywords && post.includedKeywords.length > 0) {
      send = false
      for (let i = 0; i < post.includedKeywords.length; i++) {
        if (body.entry[0].changes[0].value.message.toLowerCase().includes(post.includedKeywords[i].toLowerCase())) {
          send = true
          break
        }
      }
    }
    if (post.excludedKeywords && post.excludedKeywords.length > 0) {
      send = true
      for (let i = 0; i < post.excludedKeywords.length; i++) {
        if (body.entry[0].changes[0].value.message.toLowerCase().includes(post.excludedKeywords[i].toLowerCase())) {
          send = false
          break
        }
      }
    }
  }
  return send
}
