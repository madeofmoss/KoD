const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { Sequelize, DataTypes } = require('sequelize');
const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ======================
// Database Configuration
// ======================
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: console.log,
  retry: {
    max: 5,
    timeout: 5000,
    match: [
      /ECONNREFUSED/,
      /ETIMEDOUT/,
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/
    ]
  }
});

// =====================
// Database Models
// =====================
const Player = sequelize.define('Player', {
  playerId: { type: DataTypes.STRING, primaryKey: true },
  username: DataTypes.STRING,
  race: DataTypes.STRING,
  skill1: DataTypes.STRING,
  skill2: DataTypes.STRING,
  gold: { type: DataTypes.INTEGER, defaultValue: 100 },
  population: { type: DataTypes.INTEGER, defaultValue: 3 },
  mood: { type: DataTypes.INTEGER, defaultValue: 3 },
  food: { type: DataTypes.INTEGER, defaultValue: 3 },
  turnOrder: DataTypes.INTEGER
}, {
  timestamps: false
});

const Unit = sequelize.define('Unit', {
  unitId: { type: DataTypes.STRING, primaryKey: true },
  type: DataTypes.STRING,
  level: { type: DataTypes.INTEGER, defaultValue: 1 },
  combat: DataTypes.INTEGER,
  movement: DataTypes.INTEGER,
  position: { type: DataTypes.STRING, defaultValue: 'capital' }
}, {
  timestamps: false
});

const Inventory = sequelize.define('Inventory', {
  itemId: { type: DataTypes.STRING, primaryKey: true },
  itemType: DataTypes.STRING,
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 }
}, {
  timestamps: false
});

// Set up relationships
Player.hasMany(Unit, { foreignKey: 'PlayerId' });
Player.hasMany(Inventory, { foreignKey: 'PlayerId' });
Unit.belongsTo(Player, { foreignKey: 'PlayerId' });
Inventory.belongsTo(Player, { foreignKey: 'PlayerId' });

// ======================
// Database Initialization
// ======================
async function initDatabase() {
  try {
    console.log('Attempting to connect to database...');
    console.log('Using DATABASE_URL:', process.env.DATABASE_URL ? '*****' : 'undefined');
    
    await sequelize.authenticate();
    console.log('Database connection established');
    
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized');
  } catch (error) {
    console.error('Database initialization failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// ================
// Helper Functions
// ================
function getRandomRace() {
  const races = ['Elf', 'Dwarf', 'Human', 'Orc', 'Merfolk'];
  return races[Math.floor(Math.random() * races.length)];
}

function getRandomSkill() {
  const skills = ['Farmer', 'Warrior', 'Merchant', 'Hunter', 'Medic'];
  return skills[Math.floor(Math.random() * skills.length)];
}

function getCombatValue(unitType, level) {
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
    const existingPlayer = await Player.findByPk(message.author.id);
    if (existingPlayer) return message.reply('You already have a kingdom!');

    const playerCount = await Player.count();
    
    const player = await Player.create({
      playerId: message.author.id,
      username: message.author.username,
      race: getRandomRace(),
      skill1: getRandomSkill(),
      skill2: getRandomSkill(),
      turnOrder: playerCount + 1
    });

    // Create starting units
    await Unit.bulkCreate([
      {
        unitId: `unit_${Date.now()}_1`,
        PlayerId: message.author.id,
        type: player.skill1,
        combat: getCombatValue(player.skill1, 1),
        movement: 5
      },
      {
        unitId: `unit_${Date.now()}_2`,
        PlayerId: message.author.id,
        type: player.skill2,
        combat: getCombatValue(player.skill2, 1),
        movement: 5
      }
    ]);

    message.reply('Kingdom created! Use !status to view your kingdom.');
  } catch (error) {
    console.error('Setup error:', error);
    message.reply('Error creating kingdom');
  }
}

async function handleStatusCommand(message) {
  try {
    const player = await Player.findByPk(message.author.id, {
      include: [Unit, Inventory]
    });
    
    if (!player) return message.reply('Use !setup first');

    const embed = new EmbedBuilder()
      .setTitle(`${player.username}'s Kingdom`)
      .addFields(
        { name: 'Race', value: player.race, inline: true },
        { name: 'Skills', value: `${player.skill1}, ${player.skill2}`, inline: true },
        { name: 'Gold', value: `${player.gold}g`, inline: true },
        { name: 'Population', value: player.population.toString(), inline: true },
        { name: 'Mood', value: `${player.mood}/5`, inline: true },
        { name: 'Food', value: player.food.toString(), inline: true },
        { name: 'Units', value: player.Units.length.toString(), inline: true }
      );

    message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Status error:', error);
    message.reply('Error fetching status');
  }
}

// =============
// Bot Startup
// =============
bot.on('ready', async () => {
  console.log(`Logged in as ${bot.user.tag}`);
  await initDatabase();
});

bot.on('messageCreate', async message => {
  if (!message.content.startsWith('!') || message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'setup') await handleSetupCommand(message);
  else if (command === 'status') await handleStatusCommand(message);
  // Add other commands here
});

bot.login(process.env.TOKEN).catch(error => {
  console.error('Login failed:', error);
  process.exit(1);
});
