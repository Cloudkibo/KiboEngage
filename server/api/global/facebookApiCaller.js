const needle = require('needle')

exports.facebookApiCaller = (version, path, method, data) => {
  return needle(
    method.toLowerCase(),
    `https://graph.facebook.com/${version}/${path}`,
    data
  )
}

exports.facebookApiCallerWithFile = (version, path, method, data, file) => {
  // make it callback, maybe it is not working for promise
  return needle(
    method.toLowerCase(),
    `https://graph.facebook.com/${version}/${path}`,
    data,
    { multipart: true })
}