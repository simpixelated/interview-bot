const Botkit = require('botkit');
const apiaibotkit = require('api-ai-botkit');
const config = require('./config.json');
const _ = require('lodash');

const slackToken = process.env.SLACK_TOKEN || config.SLACK_TOKEN;
const apiaiToken = process.env.APIAI_TOKEN || config.APIAI_TOKEN;

const apiai = apiaibotkit(apiaiToken);
const controller = Botkit.slackbot();

// call api.ai
controller.middleware.receive.use((bot, message, next) => {
  apiai.process(message, bot);
  apiai.all((msg, resp) => {
    console.log('received apiai response');
    _.assign(msg, { apiai: resp.result });
    next();
  });
});

/* example hard-coded response
controller.hears('hello', ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
  console.log(message);
  bot.reply(message, 'canned greeting');
});
*/

controller.hears('.*', ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  console.log(message);

  // fallback to api.ai response
  bot.reply(message, message.apiai.fulfillment.speech);

  if (_.some(message.apiai.contexts, ['name', 'interview-start'])) {
    console.log('RUN THE GAUNTLET');
    bot.startConversation(message, (err, conversation) => {
      const questions = [
        'Why did you choose your current/previous position?',
        'Why are you looking to move on?',
        'What was the most satisfying part of your current/previous position?',
        'What did you like least about your current/previous position?',
        'How do you keep up to date with the latest technologies in your profession?',
        'Are you interviewing anywhere else?',
        'What do you expect to achieve in your first month at Native Axis?',
        'Where do you want to be in three years from now?',
        'How do you feel about working remotely?',
        'If you get hired, when can you start?',
        'What compensation would you feel comfortable with?',
      ];
      _.forEach(questions, (q, i) => {
        const thread = i === 0 ? 'default' : `q${i}`;
        const nextThread = i + 1 < questions.length ? `q${i + 1}` : 'end';
        conversation.addQuestion(q, (resp, convo) => convo.gotoThread(nextThread), {}, thread);
      });
      // conversation.transitionTo('q1', 'Cool.');
      conversation.addMessage('Okay thank you very much for the valuable info, human.', 'end');
    });
  }
});

controller.spawn({
  token: slackToken,
}).startRTM();
