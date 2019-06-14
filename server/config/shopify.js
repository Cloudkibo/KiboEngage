
module.exports = function (app) {
  // session is necessary for api proxy and auth verification
  // app.use(session({secret: config.shopify.app_secret}))
  // console.log(config.shopify.app_secret)
  // const {routes, withShop} = shopifyExpress({
  //   host: config.shopify.app_host,
  //   apiKey: config.shopify.app_key,
  //   secret: config.shopify.app_secret,
  //   scope: ['write_orders, write_products'],
  //   accessMode: 'offline',
  //   afterAuth (request, response) {
  //     const { session: { accessToken, shop } } = request
  //     // install webhooks or hook into your own app here
  //     console.log('accessToken', accessToken)
  //     return response.redirect('/')
  //   }
  // })

  // app.post('/api/shopify', (req, res) => {
  //   console.log("Request in body", req.user)
  //   const shop = req.body.shop
  //   const scopes = 'write_orders, write_products'
  //   if (shop) {
  //     const state = nonce()
  //     const redirectUri = config.shopify.app_host + '/api/shopify/callback'
  //     const installUrl = 'https://' + shop +
  //       '/admin/oauth/authorize?client_id=' + config.shopify.app_key +
  //       '&scope=' + scopes +
  //       '&state=' + state +
  //       '&redirect_uri=' + redirectUri

  //     res.cookie('state', state)
  //     res.redirect(installUrl)
  //   } else {
  //     return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request')
  //   }
  // })

  // app.get('/api/shopify/callback', (req, res) => {
  //   const { shop, hmac, code, state } = req.query
  //   const stateCookie = cookie.parse(req.headers.cookie).state

  //   if (state !== stateCookie) {
  //     return res.status(403).send('Request origin cannot be verified')
  //   }

  //   if (shop && hmac && code) {
  //   // DONE: Validate request is from Shopify
  //     const map = Object.assign({}, req.query)
  //     delete map['signature']
  //     delete map['hmac']
  //     const message = querystring.stringify(map)
  //     const providedHmac = Buffer.from(hmac, 'utf-8')
  //     const generatedHash = Buffer.from(
  //     crypto
  //       .createHmac('sha256', config.shopify.app_secret)
  //       .update(message)
  //       .digest('hex'),
  //       'utf-8'
  //     )
  //     let hashEquals = false

  //     try {
  //       hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
  //     } catch (e) {
  //       hashEquals = false
  //     };

  //     if (!hashEquals) {
  //       return res.status(400).send('HMAC validation failed')
  //     }

  //   // DONE: Exchange temporary code for a permanent access token
  //     const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token'
  //     const accessTokenPayload = {
  //       client_id: config.shopify.app_key,
  //       client_secret: config.shopify.app_secret,
  //       code
  //     }

  //     request.post(accessTokenRequestUrl, { json: accessTokenPayload })
  //   .then((accessTokenResponse) => {
  //     const accessToken = accessTokenResponse.access_token

  //     res.status(200).json({message: "Got an access token, let's do something with it", accessToken: accessToken})
  //     // TODO
  //     // Use access token to make API call to 'shop' endpoint
  //   })
  //   .catch((error) => {
  //     res.status(error.statusCode >= 100 && error.statusCode < 600 ? error.statusCode : 500).send(error.error_description)
  //   })
  //   } else {
  //     res.status(400).send('Required parameters missing')
  //   }
  // })
  // mounts '/auth' and '/api' off of '/shopify'
  // app.use('/shopify', routes)
}
