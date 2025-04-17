const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const fs = require('fs'); // For logging
const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ======================
// Database Initialization
// ======================
const db = new QuickDB();
const logStream = fs.createWriteStream('bot.log', { flags: 'a' });

async function initDatabase() {
  await db.init();
  if (!await db.has('players')) await db.set('players', {});
  if (!await db.has('units')) await db.set('units', {});
  if (!await db.has('inventory')) await db.set('inventory', {});
  if (!await db.has('marketplace')) {
    await db.set('marketplace', {
      food: { price: 10 },
      tea: { price: 10 },
      ore: { price: 10 },
      gem: { price: 30 },
      medkit: { price: 10 },
      trinket: { price: 12 },
      weapon: { priceMultiplier: 10 }
    });
  }
}

// ================
// Helper Functions
// ================
function log(message) {
  const timestamp = new Date().toISOString();
  logStream.write(`[${timestamp}] ${message}\n`);
}

function getRandomRace() {
  const races = ['Elf', 'Dwarf', 'Human', 'Orc', 'Merfolk'];
  return races[Math.floor(Math.random() * races.length)];
}

function getRandomSkill() {
  const skills = ['Farmer', 'Warrior', 'Merchant', 'Hunter', 'Medic'];
  return skills[Math.floor(Math.random() * skills.length)];
}

function getCombatValue(unitType, level) {
  // Basic combat values - expand with your game's actual values
  const baseValues = {
    Farmer: 1,
    Warrior: 2 + level,
    Merchant: 1,
    Hunter: 1 + Math.floor(level/2),
    Medic: 1
  };
  return baseValues[unitType] || 1;
}

// =================
// Command Handlers
// =================
async function handleSetupCommand(message) {
  try {
    const existingPlayer = await db.get(`players.${message.author.id}`);
    if (existingPlayer) return message.reply('You already have a kingdom!');

    await db.set(`players.${message.author.id}`, {
      username: message.author.username,
      race: getRandomRace(),
      skills: [getRandomSkill(), getRandomSkill()],
      gold: 100,
      population: 3,
      mood: 3,
      food: 3,
      turnOrder: Object.keys(await db.get('players')).length + 1
    });

    message.reply('Kingdom created! Use !status to view your kingdom.');
    log(`New kingdom created for ${message.author.username}`);
  } catch (error) {
    log(`Setup error: ${error}`);
    message.reply('Error creating kingdom');
  }
}

async function handleStatusCommand(message) {
  try {
    const player = await db.get(`players.${message.author.id}`);
    if (!player) return message.reply('Use !setup first');

    const embed = new EmbedBuilder()
      .setTitle(`${player.username}'s Kingdom`)
      .addFields(
        { name: 'Race', value: player.race, inline: true },
        { name: 'Skills', value: player.skills.join(', '), inline: true },
        { name: 'Gold', value: `${player.gold}g`, inline: true },
        { name: 'Population', value: player.population.toString(), inline: true },
        { name: 'Mood', value: `${player.mood}/5`, inline: true },
        { name: 'Food', value: player.food.toString(), inline: true }
      );

    message.reply({ embeds: [embed] });
  } catch (error) {
    log(`Status error: ${error}`);
    message.reply('Error fetching status');
  }
}

async function handleBuyCommand(message, args) {
  try {
    const [item, quantity = 1] = args.map(arg => isNaN(arg) ? arg : parseInt(arg));
    const player = await db.get(`players.${message.author.id}`);
    if (!player) return message.reply('Use !setup first');

    const marketplace = await db.get('marketplace');
    if (!marketplace[item]) return message.reply('Invalid item');

    const totalCost = marketplace[item].price * quantity;
    if (player.gold < totalCost) return message.reply('Not enough gold');

    await db.set(`players.${message.author.id}.gold`, player.gold - totalCost);
    
    const inventory = await db.get(`inventory.${message.author.id}`) || {};
    inventory[item] = (inventory[item] || 0) + quantity;
    await db.set(`inventory.${message.author.id}`, inventory);

    message.reply(`Purchased ${quantity}x ${item} for ${totalCost}g`);
    log(`${message.author.username} bought ${quantity}x ${item}`);
  } catch (error) {
    log(`Buy error: ${error}`);
    message.reply('Error processing purchase');
  }
}

// ==============
// Game Systems
// ==============
async function processDailyUpdates() {
  try {
    log('Processing daily updates...');
    const players = await db.get('players') || {};

    for (const [playerId, player] of Object.entries(players)) {
      // Population changes
      let populationChange = 0;
      if (player.mood === 5) populationChange += 1;
      if (player.food > player.population) populationChange += 1;
      if (player.mood === 1) populationChange -= 1;
      if (player.population > player.food) populationChange -= 1;

      // Update player
      await db.set(`players.${playerId}`, {
        ...player,
        population: Math.max(0, player.population + populationChange),
        gold: player.gold + 10,
        food: Math.max(0, player.food - player.population)
      });

      // Add daily units
      await addUnit(playerId, player.skills[0]);
      await addUnit(playerId, player.skills[1]);
    }
    log('Daily updates complete');
  } catch (error) {
    log(`Daily update error: ${error}`);
  }
}

async function addUnit(playerId, unitType) {
  const unitId = `unit_${Date.now()}`;
  await db.set(`units.${unitId}`, {
    playerId,
    type: unitType,
    level: 1,
    combat: getCombatValue(unitType, 1),
    movement: 5, // Base movement
    position: 'capital',
    inventory: []
  });
}

// =============
// Bot Startup
// =============
bot.on('ready', async () => {
  console.log(`Logged in as ${bot.user.tag}`);
  await initDatabase();
  setInterval(processDailyUpdates, 24 * 60 * 60 * 1000); // 24h updates
  log(`Bot started at ${new Date()}`);
});

bot.on('messageCreate', async message => {
  if (!message.content.startsWith('!') || message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'setup') await handleSetupCommand(message);
  else if (command === 'status') await handleStatusCommand(message);
  else if (command === 'buy') await handleBuyCommand(message, args);
  // Add other commands here
});

bot.login(process.env.TOKEN).catch(error => {
  console.error('Login failed:', error);
  log(`Login failed: ${error}`);
});
