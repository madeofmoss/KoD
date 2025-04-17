const Discord = require('discord.js');
const bot = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildMessages] });
const db = require('quick.db');

bot.on('ready', () => console.log('Bot is ready!'));

bot.on('messageCreate', message => {
  if (message.content === '!ping') {
    message.reply('Pong!');
  }
});

bot.login(process.env.TOKEN);