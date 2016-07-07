'use strict'

// Load env for local development
if (['staging', 'production'].indexOf(process.env.NODE_ENV) === -1) {
  require('dotenv').config({path: `${process.cwd()}/.env`})
}

const bodyParser = require('body-parser')
const express = require('express')
const config = require('./config')
const msn = require('./messenger')

const cm = config.messenger
const app = express()

const fbids = msn.fbids
const mUtils = msn.utils

app.use(bodyParser.json({ verify: msn.verifyRequestSignature }))
// app.use(express.static('public'))

app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === cm.validationToken) {
    console.log('Validating webhook')
    res.status(200).send(req.query['hub.challenge'])
  } else {
    console.error('Failed validation. Make sure the validation tokens match.')
    res.sendStatus(403)
  }
})

app.post('/webhook', (req, res) => {
  const data = req.body

  // Make sure this is a page subscription
  if (data.object === 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach((pageEntry) => {
      const pageID = pageEntry.id
      const timeOfEvent = pageEntry.time

      // Iterate over each messaging event
      pageEntry.messaging.forEach((messagingEvent) => {
        if (messagingEvent.optin) {
          msn.receivedAuthentication(messagingEvent)
        } else if (messagingEvent.message) {
          msn.receivedMessage(messagingEvent)
        } else if (messagingEvent.delivery) {
          msn.receivedDeliveryConfirmation(messagingEvent)
        } else if (messagingEvent.postback) {
          msn.receivedPostback(messagingEvent)
        } else {
          console.log('Webhook received unknown messagingEvent: ', messagingEvent)
        }
      })
    })

    // Must send back a 200, within 20 seconds, for successfully received the callback.
    // Otherwise, the request will time out.
    res.sendStatus(200)
  }
})

app.post('/bot/v1.0/messages', (req, res) => {
  // Sent to fb messenger
  const message = req.body
  const senderId = message.from.id
  const text = message.text

  fbids[senderId] = message

  msn.sendTextMessage(senderId, text)

  req.sendStatus(200)
})

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid
// certificate authority.
app.listen(config.app.port, () => {
  console.log(`${config.app.name} is running on port ${config.app.port}.`)
})

module.exports = app
