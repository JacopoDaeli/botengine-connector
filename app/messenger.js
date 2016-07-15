'use strict'

const crypto = require('crypto')
const request = require('request')
const shortid = require('shortid')

const mUtils = require('./messenger-utils')
const config = require('./config')
const cm = config.messenger
const cbe = config.botengine

exports.utils = mUtils

const fbids = {} // Use redis in production
exports.fbids = fbids

exports.verifyRequestSignature = function verifyRequestSignature (req, res, buf) {
  const signature = req.headers['x-hub-signature']

  if (!signature) {
    throw new Error('Couldn\'t validate the signature')
  } else {
    const elements = signature.split('=')
    const method = elements[0]
    const signatureHash = elements[1]

    const expectedHash =
      crypto.createHmac('sha1', cm.appSecret).update(buf).digest('hex')

    if (signatureHash !== expectedHash) {
      throw new Error('Couldn\'t validate the request signature')
    }
  }
}

exports.receivedAuthentication = function receivedAuthentication (event) {
  const senderId = event.sender.id
  const recipientId = event.recipient.id
  const timeOfAuth = event.timestamp

  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger'
  // plugin.
  const passThroughParam = event.optin.ref

  console.log('Received authentication for user %d and page %d with pass ' +
    'through param \'%s\' at %d', senderId, recipientId, passThroughParam, timeOfAuth)

  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  exports.sendTextMessage(senderId, 'Authentication successful')
}

exports.receivedMessage = function receivedMessage (event) {
  const senderId = event.sender.id
  const recipientId = event.recipient.id
  const timeOfMessage = event.timestamp
  const message = event.message

  console.log('Received message for user %d and page %d at %d.',
    senderId, recipientId, timeOfMessage)



  const messageId = message.mid

  // You may get a text or attachment but not both
  const messageText = message.text
  const messageAttachments = message.attachments

  // exports.sendGenericMessage(senderId)

  if (messageText) {
    // Check if senderId started a conversation already
    let dataMessage = null
    const senderContext = fbids[senderId]
    if (!senderContext) {
      // Build the initial message to send to the Bot Connector
      dataMessage = mUtils.createInitialMessage(senderId, messageText)
    } else {
      dataMessage = mUtils.createNextMessage(senderId, senderContext, messageText)
    }

    console.log('Sending to whatson:')
    console.log(dataMessage)

    new Promise((resolve, reject) => {
      request({
        url: cbe.app.endpoint,
        method: 'POST',
        json: true,
        body: dataMessage
      }, (err, httpResponse, body) => {
        if (err) return reject(err)
        if (httpResponse.statusCode > 399) return reject(httpResponse)
        try {
          let parsedBody = body
          if (typeof body === 'string') {
            parsedBody = JSON.parse(body)
          }
          resolve(parsedBody)
        } catch (e) {
          reject(e)
        }
      })
    })
    .then((resBody) => {
      console.log('Whatson replyed:')
      console.log(resBody)
      fbids[senderId] = resBody

      let promptChoiceButtonsData = null

      if (resBody.botPerUserInConversationData && resBody.botPerUserInConversationData['BotBuilder.Data.SessionState']) {
        const callstack = resBody.botPerUserInConversationData['BotBuilder.Data.SessionState'].callstack
        const lastCall = callstack[callstack.length - 1]
        if (lastCall.id === 'BotBuilder.Dialogs.Prompt' && lastCall.state.listStyle === 'button') {
          promptChoiceButtonsData = lastCall.state.enumValues
        }
      }

      if (promptChoiceButtonsData) {
        exports.sendPromptChoiceButtonStyle(senderId, resBody.text, promptChoiceButtonsData)
      } else {
        exports.sendTextMessage(senderId, resBody.text)
      }
    })
    .catch((err) => {
      console.error(err.stack)
      exports.sendTextMessage(senderId, 'Oops! Something went wrong with your request.')
    })

  } else if (messageAttachments) {
    exports.sendTextMessage(senderId, 'Sorry but I can\'t handle this request.')
  }
}

exports.receivedDeliveryConfirmation = function receivedDeliveryConfirmation (event) {
  const senderId = event.sender.id
  const recipientId = event.recipient.id
  const delivery = event.delivery
  const messageIDs = delivery.mids
  const watermark = delivery.watermark
  const sequenceNumber = delivery.seq

  if (messageIDs) {
    messageIDs.forEach((messageID) => {
      console.log('Received delivery confirmation for message ID: %s',
        messageID)
    })
  }

  console.log('All message before %d were delivered.', watermark)
}

exports.receivedPostback = function receivedPostback (event) {
  const senderId = event.sender.id
  const recipientId = event.recipient.id
  const timeOfPostback = event.timestamp

  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  const messageText = event.postback.payload

  console.log('Received postback for user %d and page %d with payload \'%s\' ' +
    'at %d', senderId, recipientId, payload, timeOfPostback)

  let dataMessage = null
  const senderContext = fbids[senderId]
  if (!senderContext) {
    // Build the initial message to send to the Bot Connector
    dataMessage = mUtils.createInitialMessage(senderId, messageText)
  } else {
    dataMessage = mUtils.createNextMessage(senderId, senderContext, messageText)
  }

  console.log('Sending to whatson:')
  console.log(dataMessage)

  new Promise((resolve, reject) => {
    request({
      url: cbe.app.endpoint,
      method: 'POST',
      json: true,
      body: dataMessage
    }, (err, httpResponse, body) => {
      if (err) return reject(err)
      if (httpResponse.statusCode > 399) return reject(httpResponse)
      try {
        let parsedBody = body
        if (typeof body === 'string') {
          parsedBody = JSON.parse(body)
        }
        resolve(parsedBody)
      } catch (e) {
        reject(e)
      }
    })
  })
  .then((resBody) => {
    console.log('Whatson replyed:')
    console.log(resBody)
    fbids[senderId] = resBody

    let promptChoiceButtonsData = null

    if (resBody.botPerUserInConversationData && resBody.botPerUserInConversationData['BotBuilder.Data.SessionState']) {
      const callstack = resBody.botPerUserInConversationData['BotBuilder.Data.SessionState'].callstack
      const lastCall = callstack[callstack.length - 1]
      if (lastCall.id === 'BotBuilder.Dialogs.Prompt' && lastCall.state.listStyle === 'button') {
        promptChoiceButtonsData = lastCall.state.enumValues
      }
    }

    if (promptChoiceButtonsData) {
      exports.sendPromptChoiceButtonStyle(senderId, resBody.text, promptChoiceButtonsData)
    } else {
      exports.sendTextMessage(senderId, resBody.text)
    }
  })
  .catch((err) => {
    console.error(err.stack)
    exports.sendTextMessage(senderId, 'Oops! Something went wrong with your request.')
  })

  // When a postback is called, we'll send a message back to the sender to
  // let them know it was successful
  exports.sendTextMessage(senderId, 'Postback called')
}

exports.sendTextMessage = function sendTextMessage (recipientId, messageText) {
  const messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  }

  exports.callSendAPI(messageData)
}

exports.sendPromptChoiceButtonStyle = function sendPromptChoiceButtonStyle (recipientId, text, buttonsData) {
  const buttons = buttonsData.map((btnData) => {
    return {
      type: 'postback',
      title: btnData,
      payload: btnData
    }
  })

  const messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text,
          buttons
        }
      }
    }
  }

  exports.callSendAPI(messageData)
}

exports.callSendAPI = function callSendAPI (messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: cm.pageAccessToken },
    method: 'POST',
    json: messageData
  }, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      const recipientId = body.recipient_id
      const messageId = body.message_id

      console.log('Successfully sent generic message with id %s to recipient %s',
        messageId, recipientId)
    } else {
      console.error('Unable to send message.')
      if (error) {
        console.error(error)
      } else if (response.body.error) {
        console.error('Error: ', response.body.error)
      }
    }
  })
}
