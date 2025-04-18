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

      { c: 1, m: 4, produce: { item: 'weapon', minValue: 0.8, maxValue: 1.2, successRate: 60 } },

      { c: 1, m: 5, produce: { item: 'weapon', minValue: 1.8, maxValue: 2.2, successRate: 70 } },

      { c: 2, m: 5, produce: { item: 'weapon', minValue: 2.8, maxValue: 3.2, successRate: 80 } },

      { c: 2, m: 6, produce: { item: 'weapon', minValue: 3.8, maxValue: 4.2, successRate: 90 } },

      { c: 3, m: 7, produce: { item: 'weapon', minValue: 4.8, maxValue: 5.2, successRate: 95 } },

      { c: 3, m: 8, produce: { item: 'weapon', minValue: 5.8, maxValue: 6.2, successRate: 100 } }

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

  { 

    name: 'Sky Terror', 

    description: 'A Quetzacoatl has been seen in the southeast',

    effect: async (players) => {

      // No direct effect, just flavor

    }

  },

  { 

    name: 'Crustacean Fury 🦀', 

    description: 'Gigantic crabs ravage the coastlines',

    effect: async (players) => {

      // Damage coastal units

      for (const player of players) {

        const coastalUnits = await Unit.findAll({ 

          where: { 

            PlayerId: player.playerId,

            position: 'coast'

          }

        });

        

        if (coastalUnits.length > 0) {

          const unitToDamage = coastalUnits[Math.floor(Math.random() * coastalUnits.length)];

          unitToDamage.combat -= 1;

          if (unitToDamage.combat <= 0) {

            await unitToDamage.destroy();

          } else {

            await unitToDamage.save();

          }

        }

      }

    }

  },

  { 

    name: 'Moving Shadows 👥', 

    description: 'Stories of shadows lurking and whispering',

    effect: async (players) => {

      // Reduce mood for all players

      for (const player of players) {

        await player.update({ 

          mood: Math.max(1, player.mood - 1) 

        });

      }

    }

  },

  { 

    name: 'Darvu Raiders', 

    description: 'Bandits make themselves feel at home in Discordia',

    effect: async (players) => {

      // Steal gold from random players

      for (let i = 0; i < Math.ceil(players.length / 3); i++) {

        const victim = players[Math.floor(Math.random() * players.length)];

        const stolen = Math.min(20, Math.floor(victim.gold * 0.1));

        await victim.update({ gold: victim.gold - stolen });

      }

    }

  },

  { 

    name: 'Pilgrims', 

    description: 'Citizens make a pilgrimage to Discordia',

    effect: async (players) => {

      // Increase mood for all players

      for (const player of players) {

        await player.update({ 

          mood: Math.min(5, player.mood + 1) 

        });

      }

    }

  },

  { 

    name: 'Void Gate 🌌', 

    description: 'Word has spread of a Gate to the Void in the Southeast',

    effect: async (players) => {

      // No direct effect, just flavor

    }

  },

  { 

    name: 'Rat Infestation 🐀', 

    description: 'Giant rats have infested the grain stores',

    effect: async (players) => {

      // Reduce food for all players

      for (const player of players) {

        await player.update({ 

          food: Math.max(0, player.food - 1) 

        });

      }

    }

  },

  { 

    name: 'Earthquake 🌍', 

    description: 'A massive earthquake shakes the land',

    effect: async (players) => {

      // Destroy random units

      for (const player of players) {

        const units = await Unit.findAll({ 

          where: { PlayerId: player.playerId }

        });

        

        if (units.length > 0) {

          const unitToDestroy = units[Math.floor(Math.random() * units.length)];

          await unitToDestroy.destroy();

        }

      }

    }

  },

  { 

    name: 'Tornado 🌪', 

    description: 'A deadly tornado tears through the countryside',

    effect: async (players) => {

      // Destroy random units (higher chance than earthquake)

      for (const player of players) {

        const units = await Unit.findAll({ 

          where: { PlayerId: player.playerId }

        });

        

        if (units.length > 0 && Math.random() < 0.3) {

          const unitToDestroy = units[Math.floor(Math.random() * units.length)];

          await unitToDestroy.destroy();

        }

      }

    }

  },

  { 

    name: 'Wildfire 🔥', 

    description: 'A raging wildfire consumes the forests',

    effect: async (players) => {

      // Damage forest units and reduce food production

      for (const player of players) {

        const forestUnits = await Unit.findAll({ 

          where: { 

            PlayerId: player.playerId,

            position: 'forest'

          }

        });

        

        if (forestUnits.length > 0) {

          const unitToDamage = forestUnits[Math.floor(Math.random() * forestUnits.length)];

          unitToDamage.combat -= 1;

          if (unitToDamage.combat <= 0) {

            await unitToDamage.destroy();

          } else {

            await unitToDamage.save();

          }

        }

      }

    }

  },

  { 

    name: 'Pirate Raid 🏴‍☠️', 

    description: 'Pirates attack coastal settlements',

    effect: async (players) => {

      // Steal gold and damage coastal units

      for (const player of players) {

        const coastalUnits = await Unit.findAll({ 

          where: { 

            PlayerId: player.playerId,

            position: 'coast'

          }

        });

        

        if (coastalUnits.length > 0) {

          // Steal gold

          const stolen = Math.min(30, Math.floor(player.gold * 0.15));

          await player.update({ gold: player.gold - stolen });

          

          // Damage unit

          const unitToDamage = coastalUnits[Math.floor(Math.random() * coastalUnits.length)];

          unitToDamage.combat -= 2;

          if (unitToDamage.combat <= 0) {

            await unitToDamage.destroy();

          } else {

            await unitToDamage.save();

          }

        }

      }

    }

  },

  { 

    name: 'Plague 💀', 

    description: 'A deadly plague spreads through the population',

    effect: async (players) => {

      // Reduce population and mood

      for (const player of players) {

        await player.update({ 

          population: Math.max(1, player.population - 1),

          mood: Math.max(1, player.mood - 1)

        });

      }

    }

  }

];



// XP required for each level

const XP_LEVELS = [0, 100, 250, 500, 800, 1200];



// Vowels and consonants for name generation

const VOWELS = ['a', 'e', 'i', 'o', 'u'];

const CONSONANTS = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z'];



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

  lastAction: DataTypes.DATE,

  distanceToMarket: { type: DataTypes.INTEGER, defaultValue: 0 },

  distanceToMountain: { type: DataTypes.INTEGER, defaultValue: 0 },

  distanceToForest: { type: DataTypes.INTEGER, defaultValue: 0 },

  distanceToCoast: { type: DataTypes.INTEGER, defaultValue: 0 },

  // New fields for kingdom-wide XP

  farmerXp: { type: DataTypes.INTEGER, defaultValue: 0 },

  farmerLevel: { type: DataTypes.INTEGER, defaultValue: 1 },

  warriorXp: { type: DataTypes.INTEGER, defaultValue: 0 },

  warriorLevel: { type: DataTypes.INTEGER, defaultValue: 1 },

  monkXp: { type: DataTypes.INTEGER, defaultValue: 0 },

  monkLevel: { type: DataTypes.INTEGER, defaultValue: 1 },

  merchantXp: { type: DataTypes.INTEGER, defaultValue: 0 },

  merchantLevel: { type: DataTypes.INTEGER, defaultValue: 1 },

  hunterXp: { type: DataTypes.INTEGER, defaultValue: 0 },

  hunterLevel: { type: DataTypes.INTEGER, defaultValue: 1 },

  inventorXp: { type: DataTypes.INTEGER, defaultValue: 0 },

  inventorLevel: { type: DataTypes.INTEGER, defaultValue: 1 },

  architectXp: { type: DataTypes.INTEGER, defaultValue: 0 },

  architectLevel: { type: DataTypes.INTEGER, defaultValue: 1 },

  medicXp: { type: DataTypes.INTEGER, defaultValue: 0 },

  medicLevel: { type: DataTypes.INTEGER, defaultValue: 1 },

  smithXp: { type: DataTypes.INTEGER, defaultValue: 0 },

  smithLevel: { type: DataTypes.INTEGER, defaultValue: 1 },

  entertainerXp: { type: DataTypes.INTEGER, defaultValue: 0 },

  entertainerLevel: { type: DataTypes.INTEGER, defaultValue: 1 },

  rogueXp: { type: DataTypes.INTEGER, defaultValue: 0 },

  rogueLevel: { type: DataTypes.INTEGER, defaultValue: 1 },

  minerXp: { type: DataTypes.INTEGER, defaultValue: 0 },

  minerLevel: { type: DataTypes.INTEGER, defaultValue: 1 },

  // For consumable effects

  trinketActive: { type: DataTypes.BOOLEAN, defaultValue: false },

  beerActive: { type: DataTypes.BOOLEAN, defaultValue: false },

  medicineActive: { type: DataTypes.BOOLEAN, defaultValue: false }

}, { timestamps: false });



const Unit = sequelize.define('Unit', {

  unitId: { type: DataTypes.STRING, primaryKey: true },

  name: DataTypes.STRING,

  type: DataTypes.STRING,

  combat: DataTypes.FLOAT,

  movement: DataTypes.INTEGER,

  position: { type: DataTypes.STRING, defaultValue: 'capital' },

  destination: { type: DataTypes.STRING, defaultValue: null },

  distanceTraveled: { type: DataTypes.INTEGER, defaultValue: 0 },

  totalDistance: { type: DataTypes.INTEGER, defaultValue: 0 },

  lastAction: DataTypes.DATE,

  lastMove: DataTypes.DATE,

  equippedWeapon: DataTypes.FLOAT,

  equippedArmor: DataTypes.FLOAT,

  visibilityThreshold: { type: DataTypes.INTEGER, defaultValue: 0 },

  isTraveling: { type: DataTypes.BOOLEAN, defaultValue: false },

  wanderingSpaces: { type: DataTypes.INTEGER, defaultValue: 0 },

  sailingSpaces: { type: DataTypes.INTEGER, defaultValue: 0 }

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

    

    // Start movement interval

    setInterval(processMovement, 60 * 1000); // Check every minute

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

    effect: event.effect,

    isPublic: Math.random() > 0.3

  };

}



function getRandomFloat(min, max, decimals = 8) {

  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

}



function generateUnitName() {

  // Generate a simple "vowel consonant vowel consonant vowel consonant" name

  let name = '';

  for (let i = 0; i < 3; i++) {

    name += VOWELS[Math.floor(Math.random() * VOWELS.length)];

    name += CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];

  }

  

  // Check for duplicates and add number if needed

  // (This will be handled when creating the unit)

  return name;

}



// =================

// Movement System

// =================

async function processMovement() {

  try {

    const travelingUnits = await Unit.findAll({ 

      where: { 

        [Op.or]: [

          { isTraveling: true },

          { wanderingSpaces: { [Op.gt]: 0 } },

          { sailingSpaces: { [Op.gt]: 0 } }

        ]

      },

      include: [Player]

    });



    for (const unit of travelingUnits) {

      if (unit.isTraveling) {

        // Regular movement

        const distanceTraveled = unit.distanceTraveled + unit.movement;

        

        if (distanceTraveled >= unit.totalDistance) {

          // Arrived at destination

          unit.position = unit.destination;

          unit.destination = null;

          unit.distanceTraveled = 0;

          unit.totalDistance = 0;

          unit.isTraveling = false;

          

          // Restore movement points

          const player = await Player.findByPk(unit.PlayerId);

          const levelData = SKILLS[unit.type].levels[player[`${unit.type.toLowerCase()}Level`] - 1];

          unit.movement = levelData.m;

          

          await unit.save();

          

          // Notify player

          if (player) {

            const user = await bot.users.fetch(player.playerId);

            if (user) {

              user.send(`Your ${unit.type} has arrived at ${unit.position}!`);

            }

          }

        } else {

          // Still traveling

          unit.distanceTraveled = distanceTraveled;

          await unit.save();

        }

        

        // Add XP for moving

        await addXP(unit.PlayerId, unit.type, 2);

      } else if (unit.wanderingSpaces > 0) {

        // Wandering in forest

        unit.wanderingSpaces -= unit.movement;

        if (unit.wanderingSpaces <= 0) {

          unit.wanderingSpaces = 0;

          // Restore movement points

          const player = await Player.findByPk(unit.PlayerId);

          const levelData = SKILLS[unit.type].levels[player[`${unit.type.toLowerCase()}Level`] - 1];

          unit.movement = levelData.m;

          

          // Check for monster encounter every 10 spaces

          const totalWandered = unit.totalDistance - unit.wanderingSpaces;

          if (totalWandered >= 10 && Math.floor(totalWandered / 10) > Math.floor((totalWandered - unit.movement) / 10)) {

            const monsterCR = Math.floor(totalWandered / 10);

            const combatResult = await handleCombat(unit, monsterCR, 'monster');

            

            if (combatResult.victory) {

              // Reward gold

              const reward = monsterCR * 15;

              await Player.update({ gold: player.gold + reward }, { where: { playerId: unit.PlayerId } });

              

              const user = await bot.users.fetch(unit.PlayerId);

              if (user) {

                user.send(`Your ${unit.type} defeated a CR ${monsterCR} monster and earned ${reward}g!`);

              }

            } else {

              // Unit defeated

              const user = await bot.users.fetch(unit.PlayerId);

              if (user) {

                user.send(`Your ${unit.type} was defeated by a CR ${monsterCR} monster while wandering!`);

              }

              await unit.destroy();

              continue; // Skip saving since unit is destroyed

            }

          }

        }

        await unit.save();

      } else if (unit.sailingSpaces > 0) {

        // Sailing at coast

        unit.sailingSpaces -= unit.movement;

        if (unit.sailingSpaces <= 0) {

          unit.sailingSpaces = 0;

          // Restore movement points

          const player = await Player.findByPk(unit.PlayerId);

          const levelData = SKILLS[unit.type].levels[player[`${unit.type.toLowerCase()}Level`] - 1];

          unit.movement = levelData.m;

          

          // Check for rewards and encounters

          const totalSailed = unit.totalDistance - unit.sailingSpaces;

          

          // 10% chance every 20 spaces for food

          if (totalSailed >= 20 && Math.floor(totalSailed / 20) > Math.floor((totalSailed - unit.movement) / 20)) {

            if (Math.random() < 0.1) {

              await addToInventory(unit.PlayerId, 'food', 1);

              const user = await bot.users.fetch(unit.PlayerId);

              if (user) {

                user.send(`Your ${unit.type} found 1 food while sailing!`);

              }

            }

          }

          

          // 1% chance every 30 spaces for gem

          if (totalSailed >= 30 && Math.floor(totalSailed / 30) > Math.floor((totalSailed - unit.movement) / 30)) {

            if (Math.random() < 0.01) {

              await addToInventory(unit.PlayerId, 'gem', 1);

              const user = await bot.users.fetch(unit.PlayerId);

              if (user) {

                user.send(`Your ${unit.type} found 1 gem while sailing!`);

              }

            }

          }

          

          // Pirate attack chance for sailing 30+ spaces

          if (totalSailed >= 30 && Math.random() < 0.2) {

            const pirateCR = Math.floor(Math.random() * 5) + 1;

            const combatResult = await handleCombat(unit, pirateCR, 'pirate');

            

            if (combatResult.victory) {

              const user = await bot.users.fetch(unit.PlayerId);

              if (user) {

                user.send(`Your ${unit.type} defeated pirate attackers (CR ${pirateCR}) while sailing!`);

              }

            } else {

              // Unit defeated

              const user = await bot.users.fetch(unit.PlayerId);

              if (user) {

                user.send(`Your ${unit.type} was defeated by pirates (CR ${pirateCR}) while sailing!`);

              }

              await unit.destroy();

              continue; // Skip saving since unit is destroyed

            }

          }

        }

        await unit.save();

      }

    }

  } catch (error) {

    console.error('Movement processing error:', error);

  }

}



async function handleCombat(unit, enemyCR, enemyType) {

  const player = await Player.findByPk(unit.PlayerId);

  const unitCR = unit.combat + (unit.equippedWeapon || 0);

  

  // Calculate combat result

  const playerRoll = Math.random() * unitCR;

  const enemyRoll = Math.random() * enemyCR;

  

  if (playerRoll > enemyRoll) {

    // Victory

    unit.combat -= enemyCR * 0.2; // Take some damage

    if (unit.combat <= 0) {

      await unit.destroy();

      return { victory: false };

    } else {

      await unit.save();

      return { victory: true };

    }

  } else {

    // Defeat

    await unit.destroy();

    return { victory: false };

  }

}



function getMovementCost(from, to, unitType) {

  // Special movement costs based on terrain and unit type

  if (to === 'water' || to === 'coast') {

    return unitType === 'Merfolk' || unitType === 'Kappa' ? 2 : 3;

  }

  if (to === 'mountain') {

    return unitType === 'Avian' ? 2 : 3;

  }

  if (to === 'forest') {

    return unitType === 'Elf' || unitType === 'Treefolk' || unitType === 'Xathri' ? 1 : 2;

  }

  return 1; // Default movement cost

}



// =================

// XP System (now kingdom-wide)

// =================

async function addXP(playerId, skill, amount) {

  const player = await Player.findByPk(playerId);

  if (!player) return false;

  

  const xpField = `${skill.toLowerCase()}Xp`;

  const levelField = `${skill.toLowerCase()}Level`;

  

  player[xpField] += amount;

  

  // Check if skill should level up

  if (player[levelField] < 6 && player[xpField] >= XP_LEVELS[player[levelField]]) {

    player[levelField] += 1;

    player[xpField] = 0;

    

    await player.save();

    

    // Notify player

    const user = await bot.users.fetch(playerId);

    if (user) {

      user.send(`🥳 Level Up! Your ${skill} is now level ${player[levelField]} 📈`);

    }

    

    return true; // Leveled up

  }

  

  await player.save();

  return false; // Didn't level up

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

    const distanceToMarket = 8 + Math.floor(Math.random() * 5); // 8-12

    const distanceToMountain = 5 + Math.floor(Math.random() * 6); // 5-10

    const distanceToForest = 3 + Math.floor(Math.random() * 5); // 3-7

    const distanceToCoast = 6 + Math.floor(Math.random() * 5); // 6-10



    const player = await Player.create({

      playerId: message.author.id,

      username: message.author.username,

      race,

      skill1,

      skill2,

      gold,

      distanceToMarket,

      distanceToMountain,

      distanceToForest,

      distanceToCoast,

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

        { name: 'Starting Resources', value: `Gold: ${gold}g\nPopulation: 3\nMood: 3\nFood: 3`, inline: false },

        { name: 'Distances', value: `Market: ${distanceToMarket} spaces\nMountain: ${distanceToMountain} spaces\nForest: ${distanceToForest} spaces\nCoast: ${distanceToCoast} spaces`, inline: false }

      );



    message.reply({ embeds: [embed] });

  } catch (error) {

    console.error('Setup error:', error);

    message.reply('Error creating kingdom');

  }

}



async function createUnit(playerId, unitType) {

  const player = await Player.findByPk(playerId);

  if (!player) return null;

  

  // Check unit limit

  const unitCount = await Unit.count({ where: { PlayerId: playerId } });

  if (unitCount >= 12) {

    return null;

  }

  

  const level = player[`${unitType.toLowerCase()}Level`];

  const skill = SKILLS[unitType];

  const levelData = skill.levels[level - 1];

  

  // Generate unique name

  let name = generateUnitName();

  let nameExists = await Unit.findOne({ where: { name } });

  let nameSuffix = 2;

  

  while (nameExists) {

    name = `${generateUnitName()}${nameSuffix}`;

    nameExists = await Unit.findOne({ where: { name } });

    nameSuffix++;

  }

  

  const unit = await Unit.create({

    unitId: `unit_${Date.now()}`,

    name,

    PlayerId: playerId,

    type: unitType,

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



async function handleTrainCommand(message, args) {

  try {

    const player = await Player.findByPk(message.author.id);

    if (!player) return message.reply('Use !setup first');



    const unitType = args[0]?.charAt(0).toUpperCase() + args[0]?.slice(1).toLowerCase();

    if (!unitType || !SKILLS[unitType]) {

      return message.reply(`Invalid unit type. Available types: ${Object.keys(SKILLS).join(', ')}`);

    }



    if (player.food < 3) {

      return message.reply('You need at least 3 food to train a unit');

    }



    // Check unit limit

    const unitCount = await Unit.count({ where: { PlayerId: player.playerId } });

    if (unitCount >= 12) {

      return message.reply('You have reached the maximum of 12 units');

    }



    await player.update({ food: player.food - 3 });

    const unit = await createUnit(player.playerId, unitType);



    if (!unit) {

      await player.update({ food: player.food + 3 }); // Refund if couldn't create

      return message.reply('Failed to create unit (possibly reached maximum units)');

    }



    message.reply(`Trained a new ${unitType}${SKILLS[unitType].emoji} named ${unit.name}!`);

  } catch (error) {

    console.error('Train error:', error);

    message.reply('Error training unit');

  }

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

        { name: 'Distances', value: `Market: ${player.distanceToMarket} spaces\nMountain: ${player.distanceToMountain} spaces\nForest: ${player.distanceToForest} spaces\nCoast: ${player.distanceToCoast} spaces`, inline: true },

        { name: 'Units', value: unitList || 'None', inline: false },

        { name: 'Inventory', value: inventoryList, inline: false }

      );



    message.reply({ embeds: [embed] });

  } catch (error) {

    console.error('Status error:', error);

    message.reply('Error fetching status');

  }

}



async function handleUnitsCommand(message) {

  try {

    const player = await Player.findByPk(message.author.id, {

      include: [Unit]

    });

    if (!player) return message.reply('Use !setup first');



    if (player.Units.length === 0) {

      return message.reply('You have no units yet. Use !train to create some.');

    }



    const unitList = player.Units.map(unit => {

      let info = `${unit.name} (${unit.unitId}): ${unit.type}${SKILLS[unit.type]?.emoji || ''} (Lvl ${player[`${unit.type.toLowerCase()}Level`]})`;

      info += `\n- Combat: ${unit.combat.toFixed(2)} | Movement: ${unit.movement}`;

      info += `\n- Position: ${unit.position}`;

      if (unit.isTraveling) {

        info += ` (Traveling to ${unit.destination}, ${unit.distanceTraveled}/${unit.totalDistance} spaces)`;

      }

      if (unit.wanderingSpaces > 0) {

        info += ` (Wandering in forest, ${unit.wanderingSpaces} spaces left)`;

      }

      if (unit.sailingSpaces > 0) {

        info += ` (Sailing at coast, ${unit.sailingSpaces} spaces left)`;

      }

      if (unit.equippedWeapon > 0) {

        info += `\n- Weapon: +${unit.equippedWeapon.toFixed(2)} combat`;

      }

      if (unit.equippedArmor > 0) {

        info += `\n- Armor: +${unit.equippedArmor.toFixed(2)} defense`;

      }

      return info;

    }).join('\n\n');



    const embed = new EmbedBuilder()

      .setTitle(`${player.username}'s Units`)

      .setDescription(unitList);



    message.reply({ embeds: [embed] });

  } catch (error) {

    console.error('Units error:', error);

    message.reply('Error fetching units');

  }

}



async function handleInventoryCommand(message) {

  try {

    const player = await Player.findByPk(message.author.id, {

      include: [Inventory]

    });

    if (!player) return message.reply('Use !setup first');



    if (player.Inventories.length === 0) {

      return message.reply('Your inventory is empty.');

    }



    const inventoryList = player.Inventories.map(item => {

      let info = `${item.itemType}: ${item.quantity}`;

      if (item.value > 0) {

        info += ` (Value: ${item.value.toFixed(2)})`;

      }

      return info;

    }).join('\n');



    const embed = new EmbedBuilder()

      .setTitle(`${player.username}'s Inventory`)

      .setDescription(inventoryList)

      .addFields(

        { name: 'Active Effects', value: 

          `Trinket Bonus: ${player.trinketActive ? 'Active (next production doubled)' : 'Inactive'}\n` +

          `Beer Bonus: ${player.beerActive ? 'Active' : 'Inactive'}\n` +

          `Medicine Bonus: ${player.medicineActive ? 'Active' : 'Inactive'}`

        }

      );



    message.reply({ embeds: [embed] });

  } catch (error) {

    console.error('Inventory error:', error);

    message.reply('Error fetching inventory');

  }

}



async function handleLevelsCommand(message) {

  try {

    const player = await Player.findByPk(message.author.id);

    if (!player) return message.reply('Use !setup first');



    const levelsList = Object.keys(SKILLS).map(skill => {

      const level = player[`${skill.toLowerCase()}Level`];

      const xp = player[`${skill.toLowerCase()}Xp`];

      const nextLevelXP = level < 6 ? XP_LEVELS[level] : 'MAX';

      return `${skill}${SKILLS[skill].emoji}: Level ${level} (${xp}/${nextLevelXP} XP)`;

    }).join('\n');



    const embed = new EmbedBuilder()

      .setTitle(`${player.username}'s Skill Levels`)

      .setDescription(levelsList);



    message.reply({ embeds: [embed] });

  } catch (error) {

    console.error('Levels error:', error);

    message.reply('Error fetching levels');

  }

}



async function handleDailyUpdate() {

  try {

    const players = await Player.findAll();

    const date = getCurrentDate();

    const event = getDailyEvent();



    // Apply event effects

    await event.effect(players);



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



    // Find the first available farmer

    const farmer = player.Units.find(u => 

      u.type === 'Farmer' && 

      (!u.lastAction || Date.now() - u.lastAction.getTime() > 15 * 60 * 1000) &&

      !u.isTraveling &&

      u.wanderingSpaces === 0 &&

      u.sailingSpaces === 0

    );

    

    if (!farmer) return message.reply('No available farmers (must wait 15 minutes between actions or unit is traveling/wandering/sailing)');



    const levelData = SKILLS.Farmer.levels[player.farmerLevel - 1];

    const roll = Math.random() * 100;

    let produced = 0;



    for (const [amount, chance] of levelData.produce.chances) {

      if (roll <= chance) {

        produced = amount;

        break;

      }

    }



    // Check for trinket bonus

    if (player.trinketActive && Math.random() < 0.5) {

      produced *= 2;

      await player.update({ trinketActive: false });

    }



    if (produced > 0) {

      await player.update({ food: player.food + produced });

      message.reply(`Your farmer produced ${produced} food!`);

      await addXP(player.playerId, 'Farmer', 12); // XP for success

    } else {

      message.reply('Your farmer worked hard but produced no food today.');

      await addXP(player.playerId, 'Farmer', 16); // More XP for failure

    }



    farmer.lastAction = new Date();

    await farmer.save();

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



    // Find the first available hunter

    const hunter = player.Units.find(u => 

      u.type === 'Hunter' && 

      (!u.lastAction || Date.now() - u.lastAction.getTime() > 15 * 60 * 1000) &&

      !u.isTraveling &&

      u.wanderingSpaces === 0 &&

      u.sailingSpaces === 0

    );

    

    if (!hunter) return message.reply('No available hunters (must wait 15 minutes between actions or unit is traveling/wandering/sailing)');



    const levelData = SKILLS.Hunter.levels[player.hunterLevel - 1];

    const roll = Math.random() * 100;

    let produced = 0;



    for (const [amount, chance] of levelData.produce.chances) {

      if (roll <= chance) {

        produced = amount;

        break;

      }

    }



    // Check for trinket bonus

    if (player.trinketActive && Math.random() < 0.5) {

      produced *= 2;

      await player.update({ trinketActive: false });

    }



    if (produced > 0) {

      await player.update({ food: player.food + produced });

      message.reply(`Your hunter brought back ${produced} food!`);

      await addXP(player.playerId, 'Hunter', 12);

    } else {

      message.reply('Your hunter returned empty-handed today.');

      await addXP(player.playerId, 'Hunter', 16);

    }



    hunter.lastAction = new Date();

    await hunter.save();

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



    // Find the first available miner on a mountain

    const miner = player.Units.find(u => 

      u.type === 'Miner' && 

      (!u.lastAction || Date.now() - u.lastAction.getTime() > 15 * 60 * 1000) &&

      u.position === 'mountain' &&

      !u.isTraveling &&

      u.wanderingSpaces === 0 &&

      u.sailingSpaces === 0

    );

    

    if (!miner) return message.reply('No available miners on mountain spaces (must wait 15 minutes between actions or unit is traveling/wandering/sailing)');



    const levelData = SKILLS.Miner.levels[player.minerLevel - 1];

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



    // Check for trinket bonus

    if (player.trinketActive && Math.random() < 0.5) {

      producedOre *= 2;

      producedGem *= 2;

      await player.update({ trinketActive: false });

    }



    if (producedOre > 0) {

      await addToInventory(player.playerId, 'ore', producedOre);

    }

    if (producedGem > 0) {

      await addToInventory(player.playerId, 'gem', producedGem);

    }



    let reply = '';

    if (producedOre > 0) reply += `Your miner produced ${producedOre} ore! `;

    if (producedGem > 0) reply += `They also found ${producedGem} gems! `;

    if (producedOre === 0 && producedGem === 0) reply = 'Your miner found nothing this time.';



    message.reply(reply);

    

    // Add XP based on results

    if (producedOre > 0 || producedGem > 0) {

      await addXP(player.playerId, 'Miner', 12);

    } else {

      await addXP(player.playerId, 'Miner', 16);

    }

    

    miner.lastAction = new Date();

    await miner.save();

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



    // Find the first available smith

    const smith = player.Units.find(u => 

      u.type === 'Smith' && 

      (!u.lastAction || Date.now() - u.lastAction.getTime() > 15 * 60 * 1000) &&

      !u.isTraveling &&

      u.wanderingSpaces === 0 &&

      u.sailingSpaces === 0

    );

    

    if (!smith) return message.reply('No available smiths (must wait 15 minutes between actions or unit is traveling/wandering/sailing)');



    const levelData = SKILLS.Smith.levels[player.smithLevel - 1];

    

    // Check if smithing succeeds

    if (Math.random() * 100 > levelData.produce.successRate) {

      message.reply('Your smith failed to create anything this time.');

      await addXP(player.playerId, 'Smith', 16);

      smith.lastAction = new Date();

      await smith.save();

      return;

    }

    

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

    await addXP(player.playerId, 'Smith', 12);

    

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



    // Find the first available inventor

    const inventor = player.Units.find(u => 

      u.type === 'Inventor' && 

      (!u.lastAction || Date.now() - u.lastAction.getTime() > 15 * 60 * 1000) &&

      !u.isTraveling &&

      u.wanderingSpaces === 0 &&

      u.sailingSpaces === 0

    );

    

    if (!inventor) return message.reply('No available inventors (must wait 15 minutes between actions or unit is traveling/wandering/sailing)');



    const levelData = SKILLS.Inventor.levels[player.inventorLevel - 1];

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

      await addXP(player.playerId, 'Inventor', 12);

    } else {

      message.reply('Your inventor failed to create anything this time.');

      await addXP(player.playerId, 'Inventor', 16);

    }



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



    // Find the first available monk

    const monk = player.Units.find(u => 

      u.type === 'Monk' && 

      (!u.lastAction || Date.now() - u.lastAction.getTime() > 15 * 60 * 1000) &&

      !u.isTraveling &&

      u.wanderingSpaces === 0 &&

      u.sailingSpaces === 0

    );

    

    if (!monk) return message.reply('No available monks (must wait 15 minutes between actions or unit is traveling/wandering/sailing)');



    const levelData = SKILLS.Monk.levels[player.monkLevel - 1];

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

      message.reply(`Your monk brewed ${produced} beer barrel(s)!`);

      await addXP(player.playerId, 'Monk', 12);

    } else {

      message.reply('Your monk failed to brew anything this time.');

      await addXP(player.playerId, 'Monk', 16);

    }



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



    // Find the first available merchant at market

    const merchant = player.Units.find(u => 

      u.type === 'Merchant' && 

      (!u.lastAction || Date.now() - u.lastAction.getTime() > 15 * 60 * 1000) &&

      u.position === 'market' &&

      !u.isTraveling &&

      u.wanderingSpaces === 0 &&

      u.sailingSpaces === 0

    );

    

    if (!merchant) return message.reply('No available merchants at market (must wait 15 minutes between actions or unit is traveling/wandering/sailing)');



    const levelData = SKILLS.Merchant.levels[player.merchantLevel - 1];

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

      await addXP(player.playerId, 'Merchant', 12);

    } else {

      message.reply('Your merchant failed to earn anything this time.');

      await addXP(player.playerId, 'Merchant', 16);

    }



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



    // Find the first available entertainer

    const entertainer = player.Units.find(u => 

      u.type === 'Entertainer' && 

      (!u.lastAction || Date.now() - u.lastAction.getTime() > 15 * 60 * 1000) &&

      !u.isTraveling &&

      u.wanderingSpaces === 0 &&

      u.sailingSpaces === 0

    );

    

    if (!entertainer) return message.reply('No available entertainers (must wait 15 minutes between actions or unit is traveling/wandering/sailing)');



    const levelData = SKILLS.Entertainer.levels[player.entertainerLevel - 1];

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

      await addXP(player.playerId, 'Entertainer', 12);

    } else {

      message.reply('Your entertainer failed to create anything this time.');

      await addXP(player.playerId, 'Entertainer', 16);

    }



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



    // Find the first available medic

    const medic = player.Units.find(u => 

      u.type === 'Medic' && 

      (!u.lastAction || Date.now() - u.lastAction.getTime() > 15 * 60 * 1000) &&

      !u.isTraveling &&

      u.wanderingSpaces === 0 &&

      u.sailingSpaces === 0

    );

    

    if (!medic) return message.reply('No available medics (must wait 15 minutes between actions or unit is traveling/wandering/sailing)');



    const levelData = SKILLS.Medic.levels[player.medicLevel - 1];

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

      await addXP(player.playerId, 'Medic', 12);

    } else {

      message.reply('Your medic failed to produce anything this time.');

      await addXP(player.playerId, 'Medic', 16);

    }



    medic.lastAction = new Date();

    await medic.save();

  } catch (error) {

    console.error('Medic error:', error);

    message.reply('Error processing medic command');

  }

}



// =================

// New Location Commands

// =================

async function handleWanderCommand(message, args) {

  try {

    const player = await Player.findByPk(message.author.id, {

      include: [Unit]

    });

    if (!player) return message.reply('Use !setup first');



    const unitId = args[0];

    const spaces = parseInt(args[1]) || 10;



    if (!unitId) return message.reply('Specify a unit ID to wander. Use !units to see your units.');

    if (spaces <= 0) return message.reply('You must wander at least 1 space.');



    const unit = player.Units.find(u => u.unitId === unitId);

    if (!unit) return message.reply('Unit not found');

    if (unit.position !== 'forest') return message.reply('Unit must be in the forest to wander');

    if (unit.isTraveling || unit.wanderingSpaces > 0 || unit.sailingSpaces > 0) {

      return message.reply('This unit is already moving or wandering/sailing');

    }



    // Start wandering

    unit.wanderingSpaces = spaces;

    unit.totalDistance = spaces;

    await unit.save();



    message.reply(`Your ${unit.type} named ${unit.name} is now wandering in the forest for ${spaces} spaces.`);

  } catch (error) {

    console.error('Wander error:', error);

    message.reply('Error processing wander command');

  }

}



async function handleSailCommand(message, args) {

  try {

    const player = await Player.findByPk(message.author.id, {

      include: [Unit]

    });

    if (!player) return message.reply('Use !setup first');



    const unitId = args[0];

    const spaces = parseInt(args[1]) || 10;



    if (!unitId) return message.reply('Specify a unit ID to sail. Use !units to see your units.');

    if (spaces <= 0) return message.reply('You must sail at least 1 space.');

    if (spaces > 100) return message.reply('You cannot sail more than 100 spaces at once.');



    const unit = player.Units.find(u => u.unitId === unitId);

    if (!unit) return message.reply('Unit not found');

    if (unit.position !== 'coast') return message.reply('Unit must be at the coast to sail');

    if (unit.isTraveling || unit.wanderingSpaces > 0 || unit.sailingSpaces > 0) {

      return message.reply('This unit is already moving or wandering/sailing');

    }



    // Start sailing

    unit.sailingSpaces = spaces;

    unit.totalDistance = spaces;

    await unit.save();



    message.reply(`Your ${unit.type} named ${unit.name} is now sailing for ${spaces} spaces.`);

  } catch (error) {

    console.error('Sail error:', error);

    message.reply('Error processing sail command');

  }

}



// =================

// Item Commands

// =================

async function handleItemCommand(message, args) {

  try {

    const player = await Player.findByPk(message.author.id, {

      include: [Inventory]

    });

    if (!player) return message.reply('Use !setup first');



    const itemType = args[0]?.toLowerCase();

    if (!itemType) return message.reply('Specify an item to use (trinket, beer_barrel, art, medicine, tea)');



    const item = player.Inventories.find(i => i.itemType === itemType);

    if (!item || item.quantity < 1) {

      return message.reply(`You don't have any ${itemType} to use`);

    }



    let effect = '';

    switch(itemType) {

      case 'trinket':

        await player.update({ trinketActive: true });

        effect = 'Your next production attempt has a 50% chance to produce double!';

        break;

      case 'beer_barrel':

        await player.update({ beerActive: true });

        effect = 'Your units gain +1 movement for their next action!';

        break;

      case 'art':

        if (Math.random() < 0.5) {

          await player.update({ mood: Math.min(5, player.mood + 1) });

          effect = 'The art improved your kingdom\'s mood by 1!';

        } else {

          effect = 'The art had no effect on your kingdom\'s mood.';

        }

        break;

      case 'medicine':

        await player.update({ medicineActive: true });

        effect = 'Your units will heal 1 HP after their next battle!';

        break;

      case 'tea':

        await player.update({ mood: Math.min(5, player.mood + 1) });

        effect = 'The tea improved your kingdom\'s mood by 1!';

        break;

      default:

        return message.reply('This item cannot be used directly');

    }



    await removeFromInventory(player.playerId, itemType, 1);

    message.reply(`Used 1 ${itemType}. ${effect}`);

  } catch (error) {

    console.error('Item error:', error);

    message.reply('Error using item');

  }

}



async function handleEquipCommand(message, args) {

  try {

    const player = await Player.findByPk(message.author.id, {

      include: [Unit, Inventory]

    });

    if (!player) return message.reply('Use !setup first');



    const unitId = args[0];

    if (!unitId) return message.reply('Specify a unit ID to equip. Use !units to see your units.');



    const unit = player.Units.find(u => u.unitId === unitId);

    if (!unit) return message.reply('Unit not found');



    const equipType = args[1]?.toLowerCase();

    if (!equipType || !['weapon', 'armor'].includes(equipType)) {

      return message.reply('Specify "weapon" or "armor" to equip');

    }



    const items = player.Inventories.filter(i => i.itemType === equipType);

    if (items.length === 0) {

      return message.reply(`You don't have any ${equipType}s to equip`);

    }



    // List available items

    let itemList = items.map((item, index) => 

      `${index + 1}. ${item.itemType} (Value: ${item.value.toFixed(2)})`

    ).join('\n');



    const promptMessage = await message.reply(`Which ${equipType} would you like to equip?\n${itemList}\n\nReply with the number or "cancel"`);



    // Wait for user response

    const filter = m => m.author.id === message.author.id;

    const collected = await message.channel.awaitMessages({

      filter,

      max: 1,

      time: 30000,

      errors: ['time']

    });

    

    const response = collected.first().content.toLowerCase();

    if (response === 'cancel') {

      return message.reply('Equip canceled.');

    }



    const choice = parseInt(response) - 1;

    if (isNaN(choice)) {

      return message.reply('Invalid choice. Please enter a number.');

    }



    if (choice < 0 || choice >= items.length) {

      return message.reply('Invalid item selection.');

    }



    const selectedItem = items[choice];

    

    // Equip the item

    if (equipType === 'weapon') {

      unit.equippedWeapon = selectedItem.value;

      await message.reply(`Equipped weapon with +${selectedItem.value.toFixed(2)} combat to your ${unit.type} named ${unit.name}!`);

    } else {

      unit.equippedArmor = selectedItem.value;

      await message.reply(`Equipped armor with +${selectedItem.value.toFixed(2)} defense to your ${unit.type} named ${unit.name}!`);

    }

    

    await unit.save();

    await removeFromInventory(player.playerId, equipType, 1);

  } catch (error) {

    console.error('Equip error:', error);

    await message.reply('Error processing equip command');

  }

}



// =================

// Movement Command

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

      return message.reply('Usage: !move <unitId> <destination> (market, mountain, forest, coast, capital)');

    }



    const validDestinations = ['market', 'mountain', 'forest', 'coast', 'capital'];

    if (!validDestinations.includes(destination)) {

      return message.reply('Invalid destination. Must be market, mountain, forest, coast, or capital');

    }



    const unit = player.Units.find(u => u.unitId === unitId);

    if (!unit) return message.reply('Unit not found');



    if (unit.position === destination) {

      return message.reply(`This unit is already at ${destination}`);

    }



    if (unit.isTraveling || unit.wanderingSpaces > 0 || unit.sailingSpaces > 0) {

      return message.reply('This unit is already moving or wandering/sailing');

    }



    // Calculate distance to destination

    let distance;

    if (destination === 'market') {

      distance = player.distanceToMarket;

    } else if (destination === 'mountain') {

      distance = player.distanceToMountain;

    } else if (destination === 'forest') {

      distance = player.distanceToForest;

    } else if (destination === 'coast') {

      distance = player.distanceToCoast;

    } else { // capital

      // If already at capital, we wouldn't get here (position check above)

      // If at other locations, distance back to capital is same as distance out

      if (unit.position === 'market') {

        distance = player.distanceToMarket;

      } else if (unit.position === 'mountain') {

        distance = player.distanceToMountain;

      } else if (unit.position === 'forest') {

        distance = player.distanceToForest;

      } else if (unit.position === 'coast') {

        distance = player.distanceToCoast;

      } else {

        distance = 0;

      }

    }



    if (distance <= 0) {

      return message.reply('Cannot move to current location');

    }



    // Special position requirements

    if (destination === 'mountain' && unit.type !== 'Miner') {

      return message.reply('Only miners can move to mountain spaces');

    }



    // Set unit to traveling

    unit.destination = destination;

    unit.totalDistance = distance;

    unit.distanceTraveled = 0;

    unit.isTraveling = true;

    await unit.save();



    // Calculate time to arrive (1 space per minute per movement point)

    const minutes = Math.ceil(distance / unit.movement);

    message.reply(`Your ${unit.type} named ${unit.name} is now traveling to ${destination}. ETA: ${minutes} minute(s)`);

    

    // Add XP for starting movement

    await addXP(player.playerId, unit.type, 2);

  } catch (error) {

    console.error('Move error:', error);

    message.reply('Error processing move command');

  }

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



    const marketUnits = player.Units.filter(u => u.position === 'market' && !u.isTraveling);

    if (marketUnits.length === 0) return message.reply('You need a unit at the market to buy items');



    const item = args[0]?.toLowerCase();

    const quantity = parseInt(args[1]) || 1;



    if (!item || !MARKET_PRICES[item]) {

      const priceList = Object.entries(MARKET_PRICES).map(([item, prices]) => {

        if (typeof prices.buy === 'function') {

          return `${item}: price varies by quality`;

        } else {

          return `${item}: ${prices.buy}g to buy, ${prices.sell}g to sell`;

        }

      }).join('\n');

      return message.reply(`Available items and prices:\n${priceList}`);

    }



    const price = typeof MARKET_PRICES[item].buy === 'function' 

      ? MARKET_PRICES[item].buy(1) * quantity 

      : MARKET_PRICES[item].buy * quantity;



    if (player.gold < price) {

      return message.reply(`Not enough gold. You need ${price}g but only have ${player.gold}g`);

    }



    const merchantLevel = player.merchantLevel;

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



    const marketUnits = player.Units.filter(u => u.position === 'market' && !u.isTraveling);

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



    const merchantLevel = player.merchantLevel;

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

    if (attacker.isTraveling || attacker.wanderingSpaces > 0 || attacker.sailingSpaces > 0) {

      return message.reply('This unit is traveling/wandering/sailing and cannot attack');

    }



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

      

      // Calculate damage (including weapon bonus)

      const attackerCombat = attacker.combat + (attacker.equippedWeapon || 0);

      const defenderCombat = targetUnit.combat + (targetUnit.equippedWeapon || 0);

      damage = Math.max(1, attackerCombat - (defenderCombat / 2));

      

      // Apply damage

      targetUnit.combat -= damage;

      if (targetUnit.combat <= 0) {

        await targetUnit.destroy();

        message.reply(`Your ${attacker.type} named ${attacker.name} defeated the enemy ${targetUnit.type}!`);

        

        // Special effects (Vampirian)

        if (player.race === 'Vampirian') {

          await addToInventory(player.playerId, 'food', 1);

          message.reply('Your Vampirian unit gained 1 food from the kill!');

        }

      } else {

        await targetUnit.save();

        message.reply(`Your ${attacker.type} named ${attacker.name} dealt ${damage.toFixed(2)} damage to enemy ${targetUnit.type} (remaining: ${targetUnit.combat.toFixed(2)})`);

      }

    } else if (targetType === 'kingdom') {

      // Find target player

      targetPlayer = await Player.findByPk(targetId);

      if (!targetPlayer) return message.reply('Target kingdom not found');

      

      // Calculate mood damage (1 mood per 5 combat)

      const attackerCombat = attacker.combat + (attacker.equippedWeapon || 0);

      damage = Math.floor(attackerCombat / 5);

      if (damage < 1) damage = 1;

      

      await targetPlayer.update({ 

        mood: Math.max(1, targetPlayer.mood - damage) 

      });

      message.reply(`Your ${attacker.type} named ${attacker.name} raided ${targetPlayer.username}'s kingdom, reducing their mood by ${damage}`);

    } else {

      return message.reply('Invalid target type (must be unit or kingdom)');

    }



    // Deduct movement from attacker

    attacker.movement -= 1;

    await attacker.save();

    

    // Add XP for attacking

    await addXP(player.playerId, attacker.type, 15);

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

    else if (command === 'units') await handleUnitsCommand(message);

    else if (command === 'inventory') await handleInventoryCommand(message);

    else if (command === 'levels') await handleLevelsCommand(message);

    else if (command === 'train') await handleTrainCommand(message, args);

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

    else if (command === 'wander') await handleWanderCommand(message, args);

    else if (command === 'sail') await handleSailCommand(message, args);

    else if (command === 'attack') await handleAttackCommand(message, args);

    else if (command === 'item') await handleItemCommand(message, args);

    else if (command === 'equip') await handleEquipCommand(message, args);

    else if (command === 'yesireallywanttoresetmykingdom') await handleResetCommand(message);

    else if (command === 'commands') {

      message.reply(`

Available commands:

!setup - Create your kingdom

!status - View your kingdom status

!units - List all your units with details

!inventory - View your detailed inventory

!levels - View your skill levels and XP

!train <type> - Train a new unit (costs 3 food)

!farm - Have a farmer produce food

!hunt - Have a hunter produce food

!mine - Have a miner produce ore/gems

!smith <weapon|armor> - Create weapons/armor

!invent - Have an inventor create trinkets

!monk - Have a monk brew beer

!merchant - Have a merchant earn gold

!entertain - Have an entertainer create art

!medic - Have a medic produce medicine

!buy <item> [quantity] - Buy from market

!sell <item> [quantity] - Sell to market

!move <unitId> <destination> - Move unit (market/mountain/forest/coast/capital)

!wander <unitId> [spaces] - Wander in forest (chance to encounter monsters)

!sail <unitId> [spaces] - Sail at coast (chance to find resources or encounter pirates)

!attack <unitId> <unit|kingdom> <targetId> - Attack

!item <item> - Use an item (trinket, beer_barrel, art, medicine, tea)

!equip <unitId> <weapon|armor> - Equip items to units

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
