const express = require('express')
const router = express.Router()
const {sendSuccessResponse} = require('../../global/response')

router.get('/:whatsAppGroupId',
  reRouting
)

function reRouting (req, res) {
  let uri = 'https://chat.whatsapp.com/' + req.params.whatsAppGroupId
  res.writeHead(301, {Location: uri})
  res.end()
//   sendSuccessResponse(res, 200, uri)
}

module.exports = router
