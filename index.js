'use strict';

const Botkit = require('botkit');
const witaibotkit = require('botkit-middleware-witai')
const apiaibotkit = require('api-ai-botkit');
const config = require('./config.json');

const slackToken = process.env.SLACK_TOKEN || config.SLACK_TOKEN;
const apiaiToken = process.env.APIAI_TOKEN || config.APIAI_TOKEN;
const witaiToken = process.env.WITAI_TOKEN || config.WITAI_TOKEN;

//const apiai = apiaiMiddleware({ token: apiaiToken });
const apiai = apiaibotkit(apiaiToken);
const witai = witaibotkit({
  token: witaiToken,
  minimum_confidence: 0.7
});
const controller = Botkit.slackbot();

// call wit.ai
controller.middleware.receive.use(witai.receive);

// call api.ai
controller.middleware.receive.use((bot, message, next) => {
  apiai.process(message, bot);
  apiai.all((message, resp, bot) => {
    console.log('received apiai response');
    message.apiai = resp.result;
    next();
  });
});

controller.hears('hello', ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
  console.log(message);
  bot.reply(message, 'canned greeting');
});

controller.hears('get_collection_total', ['direct_message', 'direct_mention'], witai.hears, function (bot, message) {
  console.log('WIT AI IS LISTENING');
  console.log(message);
  bot.reply(message, 'you looking for API info?');
});

controller.hears('.*', ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
  console.log(message);
  // fallback to api.ai response
  bot.reply(message, message.apiai.fulfillment.speech);
});

controller.spawn({
  token: slackToken
}).startRTM();