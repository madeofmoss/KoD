const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { Sequelize, DataTypes, Op } = require('sequelize');
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
  logging: false
});

// =====================
// Game Constants
// =====================
const RACES = {
  Elf: { bonus: '+1 Architect level', effect: 'Units have +1c on forest spaces' },
  Dwarf: { bonus: '+1 Smith & +1 Miner level', effect: 'None' },
  Human: { bonus: '+1 Inventor & +1 Merchant level', effect: 'None' },
  Draconian: { bonus: '+40 starting gold', effect: 'None' },
  Goblin: { bonus: 'None', effect: 'Units have -1c, Population doesn\'t decrease until food is 4 less' },
  Orc: { bonus: '+1 Warrior & +1 Smith level', effect: 'None' },
  Merfolk: { bonus: 'None', effect: '+1c on water, Water movement costs 2m' },
  Treefolk: { bonus: '+1 Architect level', effect: '+1c on forest spaces' },
  Xathri: { bonus: 'None', effect: '+1m in forest, Population doesn\'t decrease until food is 2 less' },
  Vampirian: { bonus: 'None', effect: 'Units gain +1 food when killing another unit' },
  DarkElf: { bonus: '+1 Medic level', effect: '+1c on forest spaces' },
  Hobbit: { bonus: '+1 Farmer & +1 Rogue level', effect: 'None' },
  Kappa: { bonus: 'None', effect: '+1c when attacked, Water movement costs 2m' },
  Avian: { bonus: '+1 Architect level', effect: 'Mountain movement costs 2m' }
};

const SKILLS = {
  Farmer: {
    emoji: '🌽',
    levels: [
      { c: 1, m: 5, produce: { item: 'food', chances: [[0,25],[1,65],[2,10]] } },
      { c: 1, m: 5, produce: { item: 'food', chances: [[0,20],[1,70],[2,10]] } },
      { c: 1, m: 5, produce: { item: 'food', chances: [[0,15],[1,75],[2,10]] } },
      { c: 1, m: 7, produce: { item: 'food', chances: [[0,10],[1,80],[2,10]] } },
      { c: 1, m: 8, produce: { item: 'food', chances: [[0,5],[1,85],[2,10]] } },
      { c: 1, m: 9, produce: { item: 'food', chances: [[1,85],[2,15]] } }
    ]
  },
  Warrior: {
    emoji: '🤺',
    levels: [
      { c: 2, m: 5 },
      { c: 3, m: 6 },
      { c: 4, m: 7 },
      { c: 5, m: 8 },
      { c: 6, m: 9 },
      { c: 7, m: 9 }
    ]
  },
  Monk: {
    emoji: '🙌',
    levels: [
      { c: 1, m: 7, produce: { item: 'beer_barrel', chances: [[0,20],[1,75],[2,5]] } },
      { c: 1, m: 7, produce: { item: 'beer_barrel', chances: [[0,20],[1,75],[2,5]] } },
      { c: 1, m: 8, produce: { item: 'beer_barrel', chances: [[0,20],[1,75],[2,5]] } },
      { c: 1, m: 9, produce: { item: 'beer_barrel', chances: [[0,15],[1,80],[2,5]] } },
      { c: 1, m: 9, produce: { item: 'beer_barrel', chances: [[0,15],[1,80],[2,5]] } },
      { c: 1, m: 9, produce: { item: 'beer_barrel', chances: [[0,15],[1,80],[2,5]] } }
    ]
  },
  Merchant: {
    emoji: '💰',
    levels: [
      { c: 1, m: 5, produce: { item: 'gold', chances: [[3,20],[6,60],[10,20]] } },
      { c: 1, m: 7, produce: { item: 'gold', chances: [[4,20],[8,60],[12,20]] } },
      { c: 1, m: 8, produce: { item: 'gold', chances: [[5,20],[10,60],[14,20]] } },
      { c: 1, m: 9, produce: { item: 'gold', chances: [[6,20],[12,60],[16,20]] } },
      { c: 1, m: 10, produce: { item: 'gold', chances: [[7,20],[14,60],[18,20]] } },
      { c: 1, m: 11, produce: { item: 'gold', chances: [[8,20],[16,60],[20,20]] } }
    ]
  },
  Hunter: {
    emoji: '🐺',
    levels: [
      { c: 1, m: 7, produce: { item: 'food', chances: [[0,35],[1,60],[2,5]] } },
      { c: 1, m: 7, produce: { item: 'food', chances: [[0,30],[1,60],[2,10]] } },
      { c: 3, m: 8, produce: { item: 'food', chances: [[0,30],[1,60],[2,10]] } },
      { c: 4, m: 9, produce: { item: 'food', chances: [[0,30],[1,60],[2,10]] } },
      { c: 4, m: 9, produce: { item: 'food', chances: [[0,25],[1,65],[2,10]] } },
      { c: 4, m: 10, produce: { item: 'food', chances: [[0,20],[1,70],[2,15]] } }
    ]
  },
  Inventor: {
    emoji: '🔬',
    levels: [
      { c: 1, m: 4, produce: { item: 'trinket', chances: [[0,40],[1,60]] } },
      { c: 1, m: 4, produce: { item: 'trinket', chances: [[0,30],[1,70]] } },
      { c: 1, m: 4, produce: { item: 'trinket', chances: [[0,20],[1,70],[2,10]] } },
      { c: 1, m: 4, produce: { item: 'trinket', chances: [[0,10],[1,70],[2,20]] } },
      { c: 1, m: 5, produce: { item: 'trinket', chances: [[1,80],[2,20]] } },
      { c: 1, m: 6, produce: { item: 'trinket', chances: [[1,80],[2,10],[3,10]] } }
    ]
  },
  Architect: {
    emoji: '🏛',
    levels: [
      { c: 1, m: 5 },
      { c: 1, m: 6 },
      { c: 1, m: 7 },
      { c: 1, m: 8 },
      { c: 1, m: 8, produce: { item: 'trinket', chances: [[0,40],[1,60]] } },
      { c: 1, m: 8, produce: { item: 'trinket', chances: [[0,30],[1,60],[2,10]] } }
    ]
  },
  Medic: {
    emoji: '💊',
    levels: [
      { c: 1, m: 5, produce: { item: 'medicine', chances: [[0,20],[1,70],[2,10]] } },
      { c: 1, m: 5, produce: { item: 'medicine', chances: [[0,20],[1,65],[2,15]] } },
      { c: 1, m: 6, produce: { item: 'medicine', chances: [[0,15],[1,70],[2,15]] } },
      { c: 1, m: 7, produce: { item: 'medicine', chances: [[0,10],[1,75],[2,15]] } },
      { c: 1, m: 8, produce: { item: 'medicine', chances: [[0,5],[1,80],[2,15]] } },
      { c: 1, m: 8, produce: { item: 'medicine', chances: [[1,80],[2,20]] } }
    ]
  },
  Smith: {
    emoji: '⚒',
    levels: [
      { c: 1, m: 4, produce: { item: 'weapon', minValue: 0.8, maxValue: 1.2 } },
      { c: 1, m: 5, produce: { item: 'weapon', minValue: 1.8, maxValue: 2.2 } },
      { c: 2, m: 5, produce: { item: 'weapon', minValue: 2.8, maxValue: 3.2 } },
      { c: 2, m: 6, produce: { item: 'weapon', minValue: 3.8, maxValue: 4.2 } },
      { c: 3, m: 7, produce: { item: 'weapon', minValue: 4.8, maxValue: 5.2 } },
      { c: 3, m: 8, produce: { item: 'weapon', minValue: 5.8, maxValue: 6.2 } }
    ]
  },
  Entertainer: {
    emoji: '🎻',
    levels: [
      { c: 1, m: 5, produce: { item: 'art', chances: [[0,20],[1,70],[2,10]] } },
      { c: 1, m: 6, produce: { item: 'art', chances: [[0,15],[1,70],[2,15]] } },
      { c: 1, m: 7, produce: { item: 'art', chances: [[0,10],[1,70],[2,20]] } },
      { c: 1, m: 8, produce: { item: 'art', chances: [[0,5],[1,70],[2,25]] } },
      { c: 1, m: 9, produce: { item: 'art', chances: [[1,75],[2,25]] } },
      { c: 1, m: 10, produce: { item: 'art', chances: [[1,70],[2,30]] } }
    ]
  },
  Rogue: {
    emoji: '🎭',
    levels: [
      { c: 1, m: 5, visibilityThreshold: 1 },
      { c: 1, m: 6, visibilityThreshold: 2 },
      { c: 2, m: 7, visibilityThreshold: 2 },
      { c: 2, m: 8, visibilityThreshold: 2 },
      { c: 3, m: 9, visibilityThreshold: 3 },
      { c: 3, m: 10, visibilityThreshold: 3 }
    ]
  },
  Miner: {
    emoji: '⛏',
    levels: [
      { c: 1, m: 6, produce: { item: 'ore', chances: [[0,50],[1,45],[2,5]], special: { item: 'gem', chance: 5 } } },
      { c: 1, m: 6, produce: { item: 'ore', chances: [[0,40],[1,55],[2,5]], special: { item: 'gem', chance: 5 } } },
      { c: 1, m: 7, produce: { item: 'ore', chances: [[0,30],[1,65],[2,5]], special: { item: 'gem', chance: 5 } } },
      { c: 2, m: 8, produce: { item: 'ore', chances: [[0,20],[1,75],[2,5]], special: { item: 'gem', chance: 5 } } },
      { c: 2, m: 9, produce: { item: 'ore', chances: [[0,10],[1,80],[2,10]], special: { item: 'gem', chance: 10 } } },
      { c: 3, m: 9, produce: { item: 'ore', chances: [[0,5],[1,80],[2,15]], special: { item: 'gem', chance: 15 } } }
    ],
    requires: 'mountain'
  }
};

const MARKET_PRICES = {
  food: { buy: 10, sell: 3 },
  tea: { buy: 10, sell: 3 },
  ore: { buy: 10, sell: 3 },
  gem: { buy: 30, sell: 10 },
  medkit: { buy: 10, sell: 3 },
  trinket: { buy: 12, sell: 4 },
  weapon: { buy: (value) => Math.floor(value * 10), sell: (value) => Math.floor(value * 3) },
  beer_barrel: { buy: 15, sell: 5 },
  art: { buy: 20, sell: 6 },
  medicine: { buy: 25, sell: 8 }
};

const MONTHS = [
  'start of winter ❄', 'mid winter ❄', 'late winter ❄',
  'start of spring 🌺', 'mid spring 🌺', 'late spring 🌺',
  'start of summer 🌞', 'mid summer 🌞', 'late summer 🌞',
  'start of autumn 🍂', 'mid autumn 🍂', 'late autumn 🍂'
];

const EVENTS = [
  { name: 'Sky Terror', description: 'A Quetzacoatl has been seen in the southeast' },
  { name: 'Crustacean Fury 🦀', description: 'Gigantic crabs ravage the coastlines' },
  { name: 'Moving Shadows 👥', description: 'Stories of shadows lurking and whispering' },
  { name: 'Darvu Raiders', description: 'Bandits make themselves feel at home in Discordia' },
  { name: 'Pilgrims', description: 'Citizens make a pilgrimage to Discordia' },
  { name: 'Void Gate 🌌', description: 'Word has spread of a Gate to the Void in the Southeast' }
];

// =====================
// Database Models
// =====================
const Player = sequelize.define('Player', {
  playerId: { type: DataTypes.STRING, primaryKey: true },
  username: DataTypes.STRING,
  race: DataTypes.STRING,
  skill1: DataTypes.STRING,
  skill2: DataTypes.STRING,
  gold: { type: DataTypes.INTEGER, defaultValue: 80 },
  population: { type: DataTypes.INTEGER, defaultValue: 3 },
  mood: { type: DataTypes.INTEGER, defaultValue: 3 },
  food: { type: DataTypes.INTEGER, defaultValue: 3 },
  turnOrder: DataTypes.INTEGER,
  rerollsUsed: { type: DataTypes.INTEGER, defaultValue: 0 },
  lastAction: DataTypes.DATE
}, { timestamps: false });

const Unit = sequelize.define('Unit', {
  unitId: { type: DataTypes.STRING, primaryKey: true },
  type: DataTypes.STRING,
  level: { type: DataTypes.INTEGER, defaultValue: 1 },
  xp: { type: DataTypes.INTEGER, defaultValue: 0 },
  combat: DataTypes.FLOAT,
  movement: DataTypes.INTEGER,
  position: { type: DataTypes.STRING, defaultValue: 'capital' },
  lastAction: DataTypes.DATE,
  equippedWeapon: DataTypes.FLOAT,
  equippedArmor: DataTypes.FLOAT,
  visibilityThreshold: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { timestamps: false });

const Inventory = sequelize.define('Inventory', {
  itemId: { type: DataTypes.STRING, primaryKey: true },
  itemType: DataTypes.STRING,
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  value: DataTypes.FLOAT
}, { timestamps: false });

const Structure = sequelize.define('Structure', {
  structureId: { type: DataTypes.STRING, primaryKey: true },
  type: DataTypes.STRING,
  position: DataTypes.STRING,
  hp: DataTypes.INTEGER,
  goldSpent: DataTypes.INTEGER
}, { timestamps: false });

// Set up relationships
Player.hasMany(Unit, { foreignKey: 'PlayerId' });
Player.hasMany(Inventory, { foreignKey: 'PlayerId' });
Player.hasMany(Structure, { foreignKey: 'PlayerId' });
Unit.belongsTo(Player, { foreignKey: 'PlayerId' });
Inventory.belongsTo(Player, { foreignKey: 'PlayerId' });
Structure.belongsTo(Player, { foreignKey: 'PlayerId' });

// ======================
// Game Initialization
// ======================
async function initDatabase() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('Database connected and synced');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// =================
// Helper Functions
// =================
function getRandomRace() {
  const races = Object.keys(RACES);
  return races[Math.floor(Math.random() * races.length)];
}

function getRandomSkill() {
  const skills = Object.keys(SKILLS);
  return skills[Math.floor(Math.random() * skills.length)];
}

function getCurrentDate() {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  return {
    month: MONTHS[month],
    day: day,
    season: MONTHS[Math.floor(month / 3) * 3].split(' ')[2]
  };
}

function getDailyEvent() {
  const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  return {
    name: event.name,
    description: event.description,
    isPublic: Math.random() > 0.3
  };
}

function getRandomFloat(min, max, decimals = 8) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function calculateXPForLevel(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

// =================
// Command Handlers
// =================
async function handleSetupCommand(message) {
  try {
    const existingPlayer = await Player.findByPk(message.author.id);
    if (existingPlayer) return message.reply('You already have a kingdom!');

    const playerCount = await Player.count();
    const race = getRandomRace();
    const skill1 = getRandomSkill();
    let skill2 = getRandomSkill();
    
    while (skill2 === skill1) {
      skill2 = getRandomSkill();
    }

    const gold = 80 + (playerCount * 10) + Math.floor(Math.random() * 41);

    const player = await Player.create({
      playerId: message.author.id,
      username: message.author.username,
      race,
      skill1,
      skill2,
      gold,
      turnOrder: playerCount + 1
    });

    await createUnit(message.author.id, skill1);
    await createUnit(message.author.id, skill2);

    const embed = new EmbedBuilder()
      .setTitle('Kingdom Created!')
      .setDescription(`Welcome to Discordia, ${message.author.username}!`)
      .addFields(
        { name: 'Race', value: `${race} - ${RACES[race].bonus}\n*${RACES[race].effect}*`, inline: true },
        { name: 'Skills', value: `${skill1}${SKILLS[skill1].emoji} & ${skill2}${SKILLS[skill2].emoji}`, inline: true },
        { name: 'Starting Resources', value: `Gold: ${gold}g\nPopulation: 3\nMood: 3\nFood: 3`, inline: false }
      );

    message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Setup error:', error);
    message.reply('Error creating kingdom');
  }
}

async function createUnit(playerId, unitType, level = 1) {
  const skill = SKILLS[unitType];
  const levelData = skill.levels[level - 1];
  
  const unit = await Unit.create({
    unitId: `unit_${Date.now()}`,
    PlayerId: playerId,
    type: unitType,
    level,
    combat: levelData.c,
    movement: levelData.m,
    position: 'capital'
  });

  if (levelData.visibilityThreshold !== undefined) {
    unit.visibilityThreshold = levelData.visibilityThreshold;
    await unit.save();
  }

  return unit;
}

async function handleStatusCommand(message) {
  try {
    const player = await Player.findByPk(message.author.id, {
      include: [Unit, Inventory, Structure]
    });
    
    if (!player) return message.reply('Use !setup first');

    const unitsByType = {};
    player.Units.forEach(unit => {
      unitsByType[unit.type] = (unitsByType[unit.type] || 0) + 1;
    });

    const unitList = Object.entries(unitsByType).map(([type, count]) => 
      `${type}${SKILLS[type]?.emoji || ''}: ${count}`
    ).join('\n');

    const inventorySummary = {};
    player.Inventories.forEach(item => {
      inventorySummary[item.itemType] = (inventorySummary[item.itemType] || 0) + item.quantity;
    });

    const inventoryList = Object.entries(inventorySummary).map(([type, count]) => 
      `${type}: ${count}`
    ).join('\n') || 'None';

    const embed = new EmbedBuilder()
      .setTitle(`${player.username}'s Kingdom`)
      .addFields(
        { name: 'Race', value: player.race, inline: true },
        { name: 'Skills', value: `${player.skill1}${SKILLS[player.skill1]?.emoji || ''}\n${player.skill2}${SKILLS[player.skill2]?.emoji || ''}`, inline: true },
        { name: 'Resources', value: `Gold: ${player.gold}g\nPopulation: ${player.population}\nMood: ${player.mood}/5\nFood: ${player.food}`, inline: true },
        { name: 'Units', value: unitList || 'None', inline: false },
        { name: 'Inventory', value: inventoryList, inline: false }
      );

    message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Status error:', error);
    message.reply('Error fetching status');
  }
}

async function handleDailyUpdate() {
  try {
    const players = await Player.findAll();
    const date = getCurrentDate();
    const event = getDailyEvent();

    for (const player of players) {
      let populationChange = 0;
      if (player.mood === 5) populationChange += 1;
      if (player.food > player.population) populationChange += 1;
      if (player.mood === 1) populationChange -= 1;
      if (player.population > player.food) populationChange -= 1;

      await player.update({
        population: Math.max(0, player.population + populationChange),
        food: Math.max(0, player.food - player.population),
        gold: player.gold + 10
      });

      await createUnit(player.playerId, player.skill1);
      await createUnit(player.playerId, player.skill2);
    }

    const announcementChannel = bot.channels.cache.get(process.env.ANNOUNCEMENT_CHANNEL);
    if (announcementChannel) {
      const embed = new EmbedBuilder()
        .setTitle(`${date.day}th Day, ${date.month}`)
        .setDescription(event.isPublic 
          ? `Today's event: **${event.name}**\n${event.description}`
          : 'Today\'s event is secret...')
        .setFooter({ text: 'All kingdoms have received their daily resources and units' });

      await announcementChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Daily update error:', error);
  }
}

// =================
// Production Commands
// =================
async function handleFarmCommand(message) {
  try {
    const player = await Player.findByPk(message.author.id, {
      include: [Unit]
    });
    if (!player) return message.reply('Use !setup first');

    const farmers = player.Units.filter(u => u.type === 'Farmer' && (!u.lastAction || Date.now() - u.lastAction.getTime() > 5 * 60 * 1000));
    if (farmers.length === 0) return message.reply('No available farmers (must wait 5 minutes between actions)');

    let totalFood = 0;
    for (const farmer of farmers) {
      const levelData = SKILLS.Farmer.levels[farmer.level - 1];
      const roll = Math.random() * 100;
      let produced = 0;

      for (const [amount, chance] of levelData.produce.chances) {
        if (roll <= chance) {
          produced = amount;
          break;
        }
      }

      totalFood += produced;
      
      // Add XP based on production
      const xpGain = produced > 0 ? 10 : 15; // More XP for failure
      await addXP(farmer, xpGain);
      
      farmer.lastAction = new Date();
      await farmer.save();
    }

    if (totalFood > 0) {
      await player.update({ food: player.food + totalFood });
      message.reply(`Your farmers produced ${totalFood} food!`);
    } else {
      message.reply('Your farmers worked hard but produced no food today.');
    }
  } catch (error) {
    console.error('Farm error:', error);
    message.reply('Error processing farm command');
  }
}

async function handleHuntCommand(message) {
  try {
    const player = await Player.findByPk(message.author.id, {
      include: [Unit]
    });
    if (!player) return message.reply('Use !setup first');

    const hunters = player.Units.filter(u => u.type === 'Hunter' && (!u.lastAction || Date.now() - u.lastAction.getTime() > 5 * 60 * 1000));
    if (hunters.length === 0) return message.reply('No available hunters (must wait 5 minutes between actions)');

    let totalFood = 0;
    for (const hunter of hunters) {
      const levelData = SKILLS.Hunter.levels[hunter.level - 1];
      const roll = Math.random() * 100;
      let produced = 0;

      for (const [amount, chance] of levelData.produce.chances) {
        if (roll <= chance) {
          produced = amount;
          break;
        }
      }

      totalFood += produced;
      
      // Add XP based on production
      const xpGain = produced > 0 ? 10 : 15; // More XP for failure
      await addXP(hunter, xpGain);
      
      hunter.lastAction = new Date();
      await hunter.save();
    }

    if (totalFood > 0) {
      await player.update({ food: player.food + totalFood });
      message.reply(`Your hunters brought back ${totalFood} food!`);
    } else {
      message.reply('Your hunters returned empty-handed today.');
    }
  } catch (error) {
    console.error('Hunt error:', error);
    message.reply('Error processing hunt command');
  }
}

async function handleMineCommand(message) {
  try {
    const player = await Player.findByPk(message.author.id, {
      include: [Unit, Inventory]
    });
    if (!player) return message.reply('Use !setup first');

    const miners = player.Units.filter(u => 
      u.type === 'Miner' && 
      (!u.lastAction || Date.now() - u.lastAction.getTime() > 5 * 60 * 1000) &&
      u.position === 'mountain'
    );
    
    if (miners.length === 0) return message.reply('No available miners on mountain spaces (must wait 5 minutes between actions)');

    let totalOre = 0;
    let totalGems = 0;
    for (const miner of miners) {
      const levelData = SKILLS.Miner.levels[miner.level - 1];
      const roll = Math.random() * 100;
      let producedOre = 0;

      for (const [amount, chance] of levelData.produce.chances) {
        if (roll <= chance) {
          producedOre = amount;
          break;
        }
      }

      let producedGem = 0;
      if (Math.random() * 100 < levelData.produce.special.chance) {
        producedGem = 1;
      }

      totalOre += producedOre;
      totalGems += producedGem;
      
      // Add XP based on production
      const xpGain = (producedOre > 0 || producedGem > 0) ? 10 : 15;
      await addXP(miner, xpGain);
      
      miner.lastAction = new Date();
      await miner.save();
    }

    if (totalOre > 0) {
      await addToInventory(player.playerId, 'ore', totalOre);
    }
    if (totalGems > 0) {
      await addToInventory(player.playerId, 'gem', totalGems);
    }

    let reply = '';
    if (totalOre > 0) reply += `Your miners produced ${totalOre} ore! `;
    if (totalGems > 0) reply += `They also found ${totalGems} gems! `;
    if (totalOre === 0 && totalGems === 0) reply = 'Your miners found nothing this time.';

    message.reply(reply);
  } catch (error) {
    console.error('Mine error:', error);
    message.reply('Error processing mine command');
  }
}

async function handleSmithCommand(message, args) {
  try {
    const player = await Player.findByPk(message.author.id, {
      include: [Unit, Inventory]
    });
    if (!player) return message.reply('Use !setup first');

    const itemType = args[0]?.toLowerCase();
    if (!itemType || !['weapon', 'armor'].includes(itemType)) {
      return message.reply('Please specify !smith weapon or !smith armor');
    }

    const smiths = player.Units.filter(u => 
      u.type === 'Smith' && 
      (!u.lastAction || Date.now() - u.lastAction.getTime() > 5 * 60 * 1000)
    );
    
    if (smiths.length === 0) return message.reply('No available smiths (must wait 5 minutes between actions)');

    const smith = smiths[0];
    const levelData = SKILLS.Smith.levels[smith.level - 1];
    
    const baseValue = getRandomFloat(levelData.produce.minValue, levelData.produce.maxValue);
    
    let oreUsed = 0;
    let gemsUsed = 0;
    let finalValue = baseValue;
    
    const playerOre = player.Inventories.find(i => i.itemType === 'ore')?.quantity || 0;
    const playerGems = player.Inventories.find(i => i.itemType === 'gem')?.quantity || 0;
    
    if (playerOre > 0 && await confirmAction(message, 'Use 1 ore to add +1 combat value?')) {
      oreUsed = 1;
      finalValue += 1;
    }
    
    if (playerGems > 0 && await confirmAction(message, 'Use 1 gem to multiply combat value?')) {
      gemsUsed = 1;
      finalValue *= 2;
    }
    
    await addToInventory(player.playerId, itemType, 1, finalValue);
    
    if (oreUsed > 0) {
      await removeFromInventory(player.playerId, 'ore', oreUsed);
    }
    if (gemsUsed > 0) {
      await removeFromInventory(player.playerId, 'gem', gemsUsed);
    }
    
    // Add XP for smithing
    await addXP(smith, 20);
    
    smith.lastAction = new Date();
    await smith.save();
    
    message.reply(`Created ${itemType} with combat value: ${finalValue.toFixed(8)}`);
  } catch (error) {
    console.error('Smith error:', error);
    message.reply('Error processing smith command');
  }
}

async function handleInventCommand(message) {
  try {
    const player = await Player.findByPk(message.author.id, {
      include: [Unit, Inventory]
    });
    if (!player) return message.reply('Use !setup first');

    const inventors = player.Units.filter(u => 
      u.type === 'Inventor' && 
      (!u.lastAction || Date.now() - u.lastAction.getTime() > 5 * 60 * 1000)
    );
    
    if (inventors.length === 0) return message.reply('No available inventors (must wait 5 minutes between actions)');

    const inventor = inventors[0];
    const levelData = SKILLS.Inventor.levels[inventor.level - 1];
    const roll = Math.random() * 100;
    let produced = 0;

    for (const [amount, chance] of levelData.produce.chances) {
      if (roll <= chance) {
        produced = amount;
        break;
      }
    }

    if (produced > 0) {
      await addToInventory(player.playerId, 'trinket', produced);
      message.reply(`Your inventor created ${produced} trinket(s)!`);
    } else {
      message.reply('Your inventor failed to create anything this time.');
    }

    // Add XP based on production
    const xpGain = produced > 0 ? 10 : 15;
    await addXP(inventor, xpGain);
    
    inventor.lastAction = new Date();
    await inventor.save();
  } catch (error) {
    console.error('Invent error:', error);
    message.reply('Error processing invent command');
  }
}

async function handleMonkCommand(message) {
  try {
    const player = await Player.findByPk(message.author.id, {
      include: [Unit, Inventory]
    });
    if (!player) return message.reply('Use !setup first');

    const monks = player.Units.filter(u => 
      u.type === 'Monk' && 
      (!u.lastAction || Date.now() - u.lastAction.getTime() > 5 * 60 * 1000)
    );
    
    if (monks.length === 0) return message.reply('No available monks (must wait 5 minutes between actions)');

    const monk = monks[0];
    const levelData = SKILLS.Monk.levels[monk.level - 1];
    const roll = Math.random() * 100;
    let produced = 0;

    for (const [amount, chance] of levelData.produce.chances) {
      if (roll <= chance) {
        produced = amount;
        break;
      }
    }

    if (produced > 0) {
      await addToInventory(player.playerId, 'beer_barrel', produced);
      message.reply(`Your monks brewed ${produced} beer barrel(s)!`);
    } else {
      message.reply('Your monks failed to brew anything this time.');
    }

    // Add XP based on production
    const xpGain = produced > 0 ? 10 : 15;
    await addXP(monk, xpGain);
    
    monk.lastAction = new Date();
    await monk.save();
  } catch (error) {
    console.error('Monk error:', error);
    message.reply('Error processing monk command');
  }
}

async function handleMerchantCommand(message) {
  try {
    const player = await Player.findByPk(message.author.id, {
      include: [Unit, Inventory]
    });
    if (!player) return message.reply('Use !setup first');

    const merchants = player.Units.filter(u => 
      u.type === 'Merchant' && 
      (!u.lastAction || Date.now() - u.lastAction.getTime() > 5 * 60 * 1000)
    );
    
    if (merchants.length === 0) return message.reply('No available merchants (must wait 5 minutes between actions)');

    const merchant = merchants[0];
    const levelData = SKILLS.Merchant.levels[merchant.level - 1];
    const roll = Math.random() * 100;
    let produced = 0;

    for (const [amount, chance] of levelData.produce.chances) {
      if (roll <= chance) {
        produced = amount;
        break;
      }
    }

    if (produced > 0) {
      await player.update({ gold: player.gold + produced });
      message.reply(`Your merchant earned ${produced} gold!`);
    } else {
      message.reply('Your merchant failed to earn anything this time.');
    }

    // Add XP based on production
    const xpGain = produced > 0 ? 10 : 15;
    await addXP(merchant, xpGain);
    
    merchant.lastAction = new Date();
    await merchant.save();
  } catch (error) {
    console.error('Merchant error:', error);
    message.reply('Error processing merchant command');
  }
}

async function handleEntertainCommand(message) {
  try {
    const player = await Player.findByPk(message.author.id, {
      include: [Unit, Inventory]
    });
    if (!player) return message.reply('Use !setup first');

    const entertainers = player.Units.filter(u => 
      u.type === 'Entertainer' && 
      (!u.lastAction || Date.now() - u.lastAction.getTime() > 5 * 60 * 1000)
    );
    
    if (entertainers.length === 0) return message.reply('No available entertainers (must wait 5 minutes between actions)');

    const entertainer = entertainers[0];
    const levelData = SKILLS.Entertainer.levels[entertainer.level - 1];
    const roll = Math.random() * 100;
    let produced = 0;

    for (const [amount, chance] of levelData.produce.chances) {
      if (roll <= chance) {
        produced = amount;
        break;
      }
    }

    if (produced > 0) {
      await addToInventory(player.playerId, 'art', produced);
      message.reply(`Your entertainer created ${produced} piece(s) of art!`);
    } else {
      message.reply('Your entertainer failed to create anything this time.');
    }

    // Add XP based on production
    const xpGain = produced > 0 ? 10 : 15;
    await addXP(entertainer, xpGain);
    
    entertainer.lastAction = new Date();
    await entertainer.save();
  } catch (error) {
    console.error('Entertain error:', error);
    message.reply('Error processing entertain command');
  }
}

async function handleMedicCommand(message) {
  try {
    const player = await Player.findByPk(message.author.id, {
      include: [Unit, Inventory]
    });
    if (!player) return message.reply('Use !setup first');

    const medics = player.Units.filter(u => 
      u.type === 'Medic' && 
      (!u.lastAction || Date.now() - u.lastAction.getTime() > 5 * 60 * 1000)
    );
    
    if (medics.length === 0) return message.reply('No available medics (must wait 5 minutes between actions)');

    const medic = medics[0];
    const levelData = SKILLS.Medic.levels[medic.level - 1];
    const roll = Math.random() * 100;
    let produced = 0;

    for (const [amount, chance] of levelData.produce.chances) {
      if (roll <= chance) {
        produced = amount;
        break;
      }
    }

    if (produced > 0) {
      await addToInventory(player.playerId, 'medicine', produced);
      message.reply(`Your medic produced ${produced} medicine(s)!`);
    } else {
      message.reply('Your medic failed to produce anything this time.');
    }

    // Add XP based on production
    const xpGain = produced > 0 ? 10 : 15;
    await addXP(medic, xpGain);
    
    medic.lastAction = new Date();
    await medic.save();
  } catch (error) {
    console.error('Medic error:', error);
    message.reply('Error processing medic command');
  }
}

// =================
// XP System
// =================
async function addXP(unit, amount) {
  unit.xp += amount;
  const xpNeeded = calculateXPForLevel(unit.level);
  
  if (unit.xp >= xpNeeded && unit.level < 6) {
    unit.level += 1;
    unit.xp = 0;
    
    // Update unit stats based on new level
    const levelData = SKILLS[unit.type].levels[unit.level - 1];
    unit.combat = levelData.c;
    unit.movement = levelData.m;
    
    if (levelData.visibilityThreshold !== undefined) {
      unit.visibilityThreshold = levelData.visibilityThreshold;
    }
    
    await unit.save();
    return true; // Leveled up
  }
  
  await unit.save();
  return false; // Didn't level up
}

// =================
// Movement System
// =================
async function handleMoveCommand(message, args) {
  try {
    const player = await Player.findByPk(message.author.id, {
      include: [Unit]
    });
    if (!player) return message.reply('Use !setup first');

    const unitId = args[0];
    const destination = args[1]?.toLowerCase();

    if (!unitId || !destination) {
      return message.reply('Usage: !move <unitId> <destination> (capital, market, mountain, etc.)');
    }

    const unit = player.Units.find(u => u.unitId === unitId);
    if (!unit) return message.reply('Unit not found');

    // Check if unit has enough movement
    const movementCost = getMovementCost(unit.position, destination, unit.type);
    if (unit.movement < movementCost) {
      return message.reply(`Not enough movement (needs ${movementCost}, has ${unit.movement})`);
    }

    // Special position requirements
    if (destination === 'mountain' && unit.type !== 'Miner') {
      return message.reply('Only miners can move to mountain spaces');
    }

    // Update unit
    unit.position = destination;
    unit.movement -= movementCost;
    await unit.save();

    message.reply(`Moved ${unit.type} to ${destination}. Remaining movement: ${unit.movement}`);
  } catch (error) {
    console.error('Move error:', error);
    message.reply('Error processing move command');
  }
}

function getMovementCost(from, to, unitType) {
  // Special movement costs based on terrain and unit type
  if (to === 'water') {
    return unitType === 'Merfolk' || unitType === 'Kappa' ? 2 : 3;
  }
  if (to === 'mountain') {
    return unitType === 'Avian' ? 2 : 3;
  }
  return 1; // Default movement cost
}

// =================
// Inventory Helpers
// =================
async function addToInventory(playerId, itemType, quantity = 1, value = 0) {
  const existingItem = await Inventory.findOne({ 
    where: { 
      PlayerId: playerId, 
      itemType 
    } 
  });

  if (existingItem) {
    await existingItem.update({ 
      quantity: existingItem.quantity + quantity,
      value: value > 0 ? value : existingItem.value 
    });
  } else {
    await Inventory.create({
      itemId: `item_${Date.now()}`,
      PlayerId: playerId,
      itemType,
      quantity,
      value
    });
  }
}

async function removeFromInventory(playerId, itemType, quantity = 1) {
  const item = await Inventory.findOne({ 
    where: { 
      PlayerId: playerId, 
      itemType 
    } 
  });

  if (!item) return false;
  
  if (item.quantity > quantity) {
    await item.update({ quantity: item.quantity - quantity });
  } else {
    await item.destroy();
  }
  
  return true;
}

async function confirmAction(message, question) {
  const filter = m => m.author.id === message.author.id;
  await message.reply(`${question} (yes/no)`);
  
  try {
    const collected = await message.channel.awaitMessages({
      filter,
      max: 1,
      time: 30000,
      errors: ['time']
    });
    
    const response = collected.first().content.toLowerCase();
    return response === 'yes' || response === 'y';
  } catch {
    return false;
  }
}

// =================
// Market Commands
// =================
async function handleBuyCommand(message, args) {
  try {
    const player = await Player.findByPk(message.author.id, {
      include: [Unit, Inventory]
    });
    if (!player) return message.reply('Use !setup first');

    const marketUnits = player.Units.filter(u => u.position === 'market');
    if (marketUnits.length === 0) return message.reply('You need a unit at the market to buy items');

    const item = args[0]?.toLowerCase();
    const quantity = parseInt(args[1]) || 1;

    if (!item || !MARKET_PRICES[item]) {
      return message.reply(`Available items: ${Object.keys(MARKET_PRICES).join(', ')}`);
    }

    const price = typeof MARKET_PRICES[item].buy === 'function' 
      ? MARKET_PRICES[item].buy(1) * quantity 
      : MARKET_PRICES[item].buy * quantity;

    if (player.gold < price) {
      return message.reply(`Not enough gold. You need ${price}g but only have ${player.gold}g`);
    }

    const merchantLevel = player.Units
      .filter(u => u.type === 'Merchant')
      .reduce((max, u) => Math.max(max, u.level), 0);
    
    const discount = merchantLevel * 0.05;
    const finalPrice = Math.floor(price * (1 - discount));

    await player.update({ gold: player.gold - finalPrice });
    await addToInventory(player.playerId, item, quantity);

    message.reply(`Purchased ${quantity} ${item} for ${finalPrice}g${discount > 0 ? ` (${discount*100}% discount applied)` : ''}`);
  } catch (error) {
    console.error('Buy error:', error);
    message.reply('Error processing buy command');
  }
}

async function handleSellCommand(message, args) {
  try {
    const player = await Player.findByPk(message.author.id, {
      include: [Unit, Inventory]
    });
    if (!player) return message.reply('Use !setup first');

    const marketUnits = player.Units.filter(u => u.position === 'market');
    if (marketUnits.length === 0) return message.reply('You need a unit at the market to sell items');

    const item = args[0]?.toLowerCase();
    const quantity = parseInt(args[1]) || 1;

    if (!item || !MARKET_PRICES[item]) {
      return message.reply(`Available items: ${Object.keys(MARKET_PRICES).join(', ')}`);
    }

    const inventoryItem = player.Inventories.find(i => i.itemType === item);
    if (!inventoryItem || inventoryItem.quantity < quantity) {
      return message.reply(`You don't have enough ${item} to sell`);
    }

    const price = typeof MARKET_PRICES[item].sell === 'function' 
      ? MARKET_PRICES[item].sell(inventoryItem.value) * quantity 
      : MARKET_PRICES[item].sell * quantity;

    const merchantLevel = player.Units
      .filter(u => u.type === 'Merchant')
      .reduce((max, u) => Math.max(max, u.level), 0);
    
    const discount = merchantLevel * 0.05;
    const finalPrice = Math.floor(price * (1 + discount)); // Bonus when selling

    await player.update({ gold: player.gold + finalPrice });
    await removeFromInventory(player.playerId, item, quantity);

    message.reply(`Sold ${quantity} ${item} for ${finalPrice}g${discount > 0 ? ` (${discount*100}% bonus applied)` : ''}`);
  } catch (error) {
    console.error('Sell error:', error);
    message.reply('Error processing sell command');
  }
}

// =================
// Combat System
// =================
async function handleAttackCommand(message, args) {
  try {
    const player = await Player.findByPk(message.author.id, {
      include: [Unit, Inventory]
    });
    if (!player) return message.reply('Use !setup first');

    const attackerId = args[0];
    const targetType = args[1]?.toLowerCase();
    const targetId = args[2];

    if (!attackerId || !targetType || !targetId) {
      return message.reply('Usage: !attack <attackerId> <unit|kingdom> <targetId>');
    }

    const attacker = player.Units.find(u => u.unitId === attackerId);
    if (!attacker) return message.reply('Attacker not found');

    if (attacker.combat <= 0) return message.reply('This unit cannot attack (0 combat value)');

    // Check if attacker has enough movement (attacking costs 1 movement)
    if (attacker.movement < 1) {
      return message.reply('This unit doesn\'t have enough movement to attack');
    }

    let targetPlayer, targetUnit, damage;
    if (targetType === 'unit') {
      // Find target unit (must be in same position)
      targetUnit = await Unit.findOne({ 
        where: { 
          unitId: targetId,
          position: attacker.position 
        },
        include: [Player]
      });
      
      if (!targetUnit) return message.reply('Target unit not found in your location');
      targetPlayer = targetUnit.Player;
      
      // Calculate damage
      damage = Math.max(1, attacker.combat - (targetUnit.combat / 2));
      
      // Apply damage
      targetUnit.combat -= damage;
      if (targetUnit.combat <= 0) {
        await targetUnit.destroy();
        message.reply(`Your ${attacker.type} defeated the enemy ${targetUnit.type}!`);
        
        // Special effects (Vampirian)
        if (player.race === 'Vampirian') {
          await addToInventory(player.playerId, 'food', 1);
          message.reply('Your Vampirian unit gained 1 food from the kill!');
        }
      } else {
        await targetUnit.save();
        message.reply(`Your ${attacker.type} dealt ${damage.toFixed(2)} damage to enemy ${targetUnit.type} (remaining: ${targetUnit.combat.toFixed(2)})`);
      }
    } else if (targetType === 'kingdom') {
      // Find target player
      targetPlayer = await Player.findByPk(targetId);
      if (!targetPlayer) return message.reply('Target kingdom not found');
      
      // Calculate mood damage (1 mood per 5 combat)
      damage = Math.floor(attacker.combat / 5);
      if (damage < 1) damage = 1;
      
      await targetPlayer.update({ 
        mood: Math.max(1, targetPlayer.mood - damage) 
      });
      message.reply(`Your ${attacker.type} raided ${targetPlayer.username}'s kingdom, reducing their mood by ${damage}`);
    } else {
      return message.reply('Invalid target type (must be unit or kingdom)');
    }

    // Deduct movement from attacker
    attacker.movement -= 1;
    await attacker.save();
    
    // Add XP for attacking
    await addXP(attacker, 15);
  } catch (error) {
    console.error('Attack error:', error);
    message.reply('Error processing attack command');
  }
}

// =================
// Reset Command
// =================
async function handleResetCommand(message) {
  try {
    if (!message.content.toLowerCase().includes('yesireallywanttoresetmykingdom')) {
      return message.reply('Are you sure you want to reset your kingdom? This cannot be undone. Type "!YesIReallyWantToResetMyKingdom" to confirm.');
    }

    const player = await Player.findByPk(message.author.id);
    if (!player) return message.reply('You don\'t have a kingdom to reset');

    // Delete all associated data
    await Unit.destroy({ where: { PlayerId: player.playerId } });
    await Inventory.destroy({ where: { PlayerId: player.playerId } });
    await Structure.destroy({ where: { PlayerId: player.playerId } });
    await player.destroy();

    message.reply('Your kingdom has been completely reset. Use !setup to create a new one.');
  } catch (error) {
    console.error('Reset error:', error);
    message.reply('Error resetting kingdom');
  }
}

// =============
// Bot Startup
// =============
bot.on('ready', async () => {
  console.log(`Logged in as ${bot.user.tag}`);
  await initDatabase();
  
  // Run daily update every 24 hours
  setInterval(handleDailyUpdate, 24 * 60 * 60 * 1000);
  await handleDailyUpdate();
});

bot.on('messageCreate', async message => {
  if (!message.content.startsWith('!') || message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  try {
    if (command === 'setup') await handleSetupCommand(message);
    else if (command === 'status') await handleStatusCommand(message);
    else if (command === 'farm') await handleFarmCommand(message);
    else if (command === 'hunt') await handleHuntCommand(message);
    else if (command === 'mine') await handleMineCommand(message);
    else if (command === 'smith') await handleSmithCommand(message, args);
    else if (command === 'invent') await handleInventCommand(message);
    else if (command === 'monk') await handleMonkCommand(message);
    else if (command === 'merchant') await handleMerchantCommand(message);
    else if (command === 'entertain') await handleEntertainCommand(message);
    else if (command === 'medic') await handleMedicCommand(message);
    else if (command === 'buy') await handleBuyCommand(message, args);
    else if (command === 'sell') await handleSellCommand(message, args);
    else if (command === 'move') await handleMoveCommand(message, args);
    else if (command === 'attack') await handleAttackCommand(message, args);
    else if (command === 'yesireallywanttoresetmykingdom') await handleResetCommand(message);
    else if (command === 'commands') {
      message.reply(`
Available commands:
!setup - Create your kingdom
!status - View your kingdom status
!farm - Have farmers produce food
!hunt - Have hunters produce food
!mine - Have miners produce ore/gems
!smith <weapon|armor> - Create weapons/armor
!invent - Have inventors create trinkets
!monk - Have monks brew beer
!merchant - Have merchants earn gold
!entertain - Have entertainers create art
!medic - Have medics produce medicine
!buy <item> [quantity] - Buy from market
!sell <item> [quantity] - Sell to market
!move <unitId> <destination> - Move unit
!attack <unitId> <unit|kingdom> <targetId> - Attack
!YesIReallyWantToResetMyKingdom - Reset kingdom
      `);
    }
  } catch (error) {
    console.error(`Error processing command ${command}:`, error);
    message.reply('An error occurred while processing your command');
  }
});

bot.login(process.env.TOKEN).catch(error => {
  console.error('Login failed:', error);
  process.exit(1);
});
