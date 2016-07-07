'use strict'

const crypto = require('crypto')
const shortid = require('shortid')
const config = require('./config')
const mca = config.messenger.app

let nConversations = 0 // Use redis in production

exports.generateRandomSHA1 = function generateRandomSHA1 () {
  const shasum = crypto.createHash('sha1')
  shasum.update(shortid.generate())
  return shasum.digest('hex')
}

exports.createInitialMessage = function createInitialMessage (fbid, text) {
  const from = {
    name: fbid,
    channelId: 'fbmessenger',
    address: fbid,
    id: fbid,
    isBot: false
  }
  const to = {
    name: mca.id,
    channelId: 'fbmessenger',
    address: mca.id,
    id: mca.id,
    isBot: true
  }

  return {
    type: 'Message',
    id: exports.generateRandomSHA1(), // Randomly generated each time
    conversationId: shortid.generate(), // Randomly generated at the beginning of the conversation
    created: (new Date()).toString(),
    text,
    attachments: [], // no attachments
    from,
    to,
    participants: [from, to],
    totalParticipants: 2,
    mentions: [],
    channelMessageId: exports.generateRandomSHA1(), // Randomly generated each time
    channelConversationId: `Conv_${++nConversations}`,
    hashtags: []
  }
}

exports.createNextMessage = function createNextMessage (senderContext, text) {
  const nextMessage = Object.assign({}, senderContext)
  nextMessage.id = exports.generateRandomSHA1()
  nextMessage.channelMessageId = exports.generateRandomSHA1()
  nextMessage.text = text
  return nextMessage
}
