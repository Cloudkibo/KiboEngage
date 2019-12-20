const needle = require('needle')

exports.facebookApiCaller = (version, path, method, data) => {
  console.log(`https://graph.facebook.com/${version}/${path}`)
  return needle(
    method.toLowerCase(),
    `https://graph.facebook.com/${version}/${path}`,
    data
  )
}
