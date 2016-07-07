'use strict'

module.exports = {
  env: process.env.ENV || 'development',
  app: {
    name: 'BotEngine Connector',
    port: process.env.APP_PORT || 5000
  },
  messenger: {
    appSecret: process.env.MESSENGER_APP_SECRET,
    validationToken: process.env.MESSENGER_VALIDATION_TOKEN,
    pageAccessToken: process.env.MESSENGER_PAGE_ACCESS_TOKEN
  },
  botengine: {
    botUrl: process.env.BOTENGINE_BOT_URL || 'http://127.0.0.1:3978',
    endpoints: {
      messages: '/api/v1/messages'
    },
    app: {
      id: process.env.BOTENGINE_APP_ID || 'YourAppId',
      secret: process.env.BOTENGINE_APP_SECRET || 'YourAppSecret'
    }
  }
}
