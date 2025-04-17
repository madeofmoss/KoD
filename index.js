const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Initialize database
const db = new QuickDB();

// Initialize tables if they don't exist
async function initDatabase() {
  await db.init(); // Initialize quick.db
  
  // Set default values if they don't exist
  if (!await db.has('players')) await db.set('players', {});
  if (!await db.has('units')) await db.set('units', {});
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

bot.on('ready', async () => {
  console.log(`Logged in as ${bot.user.tag}`);
  await initDatabase();
  setInterval(processDailyUpdates, 24 * 60 * 60 * 1000); // Daily updates
});

// Command handler example
bot.on('messageCreate', async message => {
  if (!message.content.startsWith('!') || message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'setup') {
    await handleSetupCommand(message, args);
  } else if (command === 'status') {
    await handleStatusCommand(message);
  }
  // Add more commands here
});

// Command implementations
async function handleSetupCommand(message) {
  const existingPlayer = await db.get(`players.${message.author.id}`);
  if (existingPlayer) {
    return message.reply('You already have a kingdom!');
  }

  // Create new player
  await db.set(`players.${message.author.id}`, {
    username: message.author.username,
    race: getRandomRace(),
    skills: [getRandomSkill(), getRandomSkill()],
    gold: 100,
    population: 3,
    mood: 3,
    food: 3,
    turnOrder: await getNextTurnOrder()
  });

  message.reply('Your kingdom has been created!');
}

async function handleStatusCommand(message) {
  const player = await db.get(`players.${message.author.id}`);
  if (!player) {
    return message.reply('You need to setup your kingdom first with !setup');
  }

  const embed = new EmbedBuilder()
    .setTitle(`${player.username}'s Kingdom`)
    .addFields(
      { name: 'Race', value: player.race, inline: true },
      { name: 'Skills', value: player.skills.join(', '), inline: true },
      { name: 'Gold', value: player.gold.toString(), inline: true },
      { name: 'Population', value: player.population.toString(), inline: true },
      { name: 'Mood', value: player.mood.toString(), inline: true },
      { name: 'Food', value: player.food.toString(), inline: true }
    );

  message.reply({ embeds: [embed] });
}

// Daily processing
async function processDailyUpdates() {
  const players = await db.get('players') || {};
  
  for (const [playerId, player] of Object.entries(players)) {
    // Process population changes
    let populationChange = calculatePopulationChange(player);
    
    // Update player
    await db.set(`players.${playerId}`, {
      ...player,
      population: Math.max(0, player.population + populationChange),
      gold: player.gold + 10, // Daily gold income
    });
    
    // Add daily units
    await addUnit(playerId, player.skills[0]);
    await addUnit(playerId, player.skills[1]);
  }
}

// Helper functions
async function addUnit(playerId, unitType) {
  const unitId = `unit_${Date.now()}`;
  await db.set(`units.${unitId}`, {
    playerId,
    type: unitType,
    level: 1,
    combat: getCombatValue(unitType, 1),
    movement: getMovementValue(unitType, 1),
    position: 'capital' // Starting position
  });
}

function calculatePopulationChange(player) {
  let change = 0;
  if (player.mood === 5) change += 1;
  if (player.food > player.population) change += 1;
  if (player.mood === 1) change -= 1;
  if (player.population > player.food) change -= 1;
  return change;
}

// Start the bot
bot.login(process.env.TOKEN);
