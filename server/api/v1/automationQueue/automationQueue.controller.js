const AutomationQueue = require('./automationQueue.datalayer')

exports.index = function (req, res) {
  AutomationQueue.findAllAutomationQueueObjectsUsingQuery({ companyId: req.body.companyId })
    .then(automationQueue => {
      if (!automationQueue) {
        res.status(404).json({
          status: 'failed',
          description: 'Automation Queue is empty for this company. Please contact support'
        })
      }
      res.status(200).json({
        status: 'success',
        payload: automationQueue
      })
    })
    .catch(err => {
      res.status(500).json({
        status: 'failed',
        description: `Internal Server Error in fetching automation queues against companyId${JSON.stringify(err)}`
      })
    })
}

exports.create = function (req, res) {
  AutomationQueue.createAutomationQueueObject(req.body.payload)
    .then(result => {
      res.status(200).json({
        status: 'success',
        payload: result
      })
    })
    .catch(err => {
      res.status(500).json({
        status: 'failed',
        payload: err
      })
    })
}
