const needle = require('needle')

exports.facebookApiCaller = (version, path, method, data) => {
  return needle(
    method.toLowerCase(),
    `https://graph.facebook.com/${version}/${path}`,
    data
  )
}

exports.facebookApiCallerWithFile = (version, path, method, data, cb) => {
  let url = `https://graph.facebook.com/${version}/${path}`
  needle.post(url, data, { multipart: true }, function (err, resp, body) {
    if (err) {
      return cb(err)
    }
    cb(null, body)
  })
}
