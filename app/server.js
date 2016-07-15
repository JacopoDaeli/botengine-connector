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

const jsonParser = bodyParser.json()
const jsonParserWithSignature = bodyParser.json({
  verify: msn.verifyRequestSignature
})

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

app.post('/webhook', jsonParserWithSignature, (req, res) => {
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

app.post('/bot/v1.0/messages', jsonParser, (req, res) => {
  // Sent to fb messenger
  const message = req.body
  const senderId = message.to.id
  const text = message.text

  if (text) {
    fbids[senderId] = message

    console.log(JSON.stringify(message))

    let promptChoiceButtonsData = null

    if (message.botPerUserInConversationData && message.botPerUserInConversationData['BotBuilder.Data.SessionState']) {
      const callstack = message.botPerUserInConversationData['BotBuilder.Data.SessionState'].callstack
      const lastCall = callstack[callstack.length - 1]
      if (lastCall.id === 'BotBuilder.Dialogs.Prompt' && lastCall.state.listStyle === 'button') {
        promptChoiceButtonsData = lastCall.state.enumValues
      }
    }

    if (promptChoiceButtonsData) {
      msn.sendPromptChoiceButtonStyle(senderId, text, promptChoiceButtonsData)
    } else {
      msn.sendTextMessage(senderId, text)
    }
  }

  res.sendStatus(200)
})

app.listen(config.app.port, () => {
  console.log(`${config.app.name} is running on port ${config.app.port}.`)
})

module.exports = app
