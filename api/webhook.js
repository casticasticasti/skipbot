const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const bot = new TelegramBot(process.env.BOT_TOKEN);

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    bot.processUpdate(req.body);
    res.status(200).json({ ok: true });
  } else {
    res.status(200).json({ 
      status: 'SkipBot Webhook is running! 🤖',
      bot: '@paseabot',
      version: '1.0.0'
    });
  }
};
