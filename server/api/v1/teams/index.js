const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./teams.controller')

router.get('/',
  auth.isAuthenticated(),
  controller.index)

router.post('/create',
  auth.isAuthenticated(),
  validate({body: validationSchema.teamPayload}),
  controller.createTeam)

router.post('/update',
  auth.isAuthenticated(),
  validate({body: validationSchema.teamUpdatePayload}),
  controller.updateTeam)

router.delete('/delete/:id',
  auth.isAuthenticated(),
  controller.deleteTeam)

router.post('/addAgent',
  auth.isAuthenticated(),
  validate({body: validationSchema.agentPayload}),
  controller.addAgent)

router.post('/addPage',
  auth.isAuthenticated(),
  validate({body: validationSchema.pagePayload}),
  controller.addPage)

router.get('/removeAgent',
  auth.isAuthenticated(),
  validate({body: validationSchema.agentPayload}),
  controller.removeAgent)

router.get('/removePage',
  auth.isAuthenticated(),
  validate({body: validationSchema.pagePayload}),
  controller.removePage)

router.get('/fetchAgents/:id',
  auth.isAuthenticated(),
  controller.fetchAgents)

router.get('/fetchPages/:id',
  auth.isAuthenticated(),
  controller.fetchPages)

module.exports = router
