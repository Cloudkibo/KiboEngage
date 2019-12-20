const needle = require('needle')

exports.facebookApiCaller = (version, path, method, data) => {
  console.log(`https://graph.facebook.com/${version}/${path}`)
  console.log('Data', data)
  return needle(
    method.toLowerCase(),
    `https://graph.facebook.com/${version}/${path}`,
    data
  )
}
