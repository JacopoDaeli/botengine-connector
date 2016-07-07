'use strict'

const crypto = require('crypto')
const request = require('request')
const shortid = require('shortid')

const mUtils = require('./messenger-utils')
const config = require('./config')
const cm = config.messenger
const cmbe = cm.botengine

const fbids = {} // Use redis in production

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
  const senderID = event.sender.id
  const recipientID = event.recipient.id
  const timeOfAuth = event.timestamp

  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger'
  // plugin.
  const passThroughParam = event.optin.ref

  console.log('Received authentication for user %d and page %d with pass ' +
    'through param \'%s\' at %d', senderID, recipientID, passThroughParam, timeOfAuth)

  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  sendTextMessage(senderID, 'Authentication successful')
}

exports.receivedMessage = function receivedMessage (event) {
  const senderID = event.sender.id
  const recipientID = event.recipient.id
  const timeOfMessage = event.timestamp
  const message = event.message

  console.log('Received message for user %d and page %d at %d with message:',
    senderID, recipientID, timeOfMessage)

  console.log(JSON.stringify(message))

  const messageId = message.mid

  // You may get a text or attachment but not both
  const messageText = message.text
  const messageAttachments = message.attachments

  // exports.sendGenericMessage(senderID)

  if (messageText) {
    // Check if senderID started a conversation already
    let dataMessage = null
    const senderContext = fbids[senderID]
    if (!senderContext) {
      // Build the initial message to send to the Bot Connector
      dataMessage = mUtils.createInitialMessage(senderID, messageText)
    } else {
      dataMessage = mUtils.createNextMessage(senderContext, messageText)
    }

    new Promise((resolve, reject) => {
      request.post({
        url: `${cmbe.botUrl}${cmbe.endpoints.messages}`,
        form: dataMessage
      }, (err, httpResponse, body) => {
        if (err) return reject(err)
        if (httpResponse.statusCode > 399) return reject(httpResponse)
        resolve(JSON.parse(body))
      })
    })
    .then((resBody) => {
      fbids[senderID] = resBody
      sendTextMessage(senderID, resBody.text)
    })
    .catch((err) => {
      console.error(err)
      sendTextMessage(senderID, 'Oops! Something went wrong with your request.')
    })

  } else if (messageAttachments) {
    sendTextMessage(senderID, 'Sorry but I can\'t handle this request.')
  }
}

exports.receivedDeliveryConfirmation = function receivedDeliveryConfirmation (event) {
  const senderID = event.sender.id
  const recipientID = event.recipient.id
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
  const senderID = event.sender.id
  const recipientID = event.recipient.id
  const timeOfPostback = event.timestamp

  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  const payload = event.postback.payload

  console.log('Received postback for user %d and page %d with payload \'%s\' ' +
    'at %d', senderID, recipientID, payload, timeOfPostback)

  // When a postback is called, we'll send a message back to the sender to
  // let them know it was successful
  sendTextMessage(senderID, 'Postback called')
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

exports.sendGenericMessage = function sendGenericMessage (recipientId) {
  const messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: [{
            title: 'rift',
            subtitle: 'Next-generation virtual reality',
            item_url: 'https://www.oculus.com/en-us/rift/',
            image_url: 'http://messengerdemo.parseapp.com/img/rift.png',
            buttons: [{
              type: 'web_url',
              url: 'https://www.oculus.com/en-us/rift/',
              title: 'Open Web URL'
            }, {
              type: 'postback',
              title: 'Call Postback',
              payload: 'Payload for first bubble',
            }],
          }, {
            title: 'touch',
            subtitle: 'Your Hands, Now in VR',
            item_url: 'https://www.oculus.com/en-us/touch/',
            image_url: 'http://messengerdemo.parseapp.com/img/touch.png',
            buttons: [{
              type: 'web_url',
              url: 'https://www.oculus.com/en-us/touch/',
              title: 'Open Web URL'
            }, {
              type: 'postback',
              title: 'Call Postback',
              payload: 'Payload for second bubble',
            }]
          }]
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
