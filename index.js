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
  Elf: { 
    bonus: '+1 Architect level', 
    effect: 'Units have +1c on forest spaces',
    applyBonus: async (player) => {
      await player.update({ architectLevel: Math.min(6, player.architectLevel + 1) });
    }
  },
  Dwarf: { 
    bonus: '+1 Smith & +1 Miner level', 
    effect: 'None',
    applyBonus: async (player) => {
      await player.update({ 
        smithLevel: Math.min(6, player.smithLevel + 1),
        minerLevel: Math.min(6, player.minerLevel + 1)
      });
    }
  },
  Human: { 
    bonus: '+1 Inventor & +1 Merchant level', 
    effect: 'None',
    applyBonus: async (player) => {
      await player.update({ 
        inventorLevel: Math.min(6, player.inventorLevel + 1),
        merchantLevel: Math.min(6, player.merchantLevel + 1)
      });
    }
  },
  Draconian: { 
    bonus: '+40 starting gold', 
    effect: 'None',
    applyBonus: async (player) => {
      await player.update({ gold: player.gold + 40 });
    }
  },
  Goblin: { 
    bonus: 'None', 
    effect: 'Units have -1c, Population doesn\'t decrease until food is 4 less',
    applyBonus: async (player) => {
      // Effect is handled in daily update
    }
  },
  Orc: { 
    bonus: '+1 Warrior & +1 Smith level', 
    effect: 'None',
    applyBonus: async (player) => {
      await player.update({ 
        warriorLevel: Math.min(6, player.warriorLevel + 1),
        smithLevel: Math.min(6, player.smithLevel + 1)
      });
    }
  },
  Merfolk: { 
    bonus: 'None', 
    effect: '+1c on water, Water movement costs 2m',
    applyBonus: async (player) => {
      // Effect is handled in movement and combat
    }
  },
  Treefolk: { 
    bonus: '+1 Architect level', 
    effect: '+1c on forest spaces',
    applyBonus: async (player) => {
      await player.update({ architectLevel: Math.min(6, player.architectLevel + 1) });
    }
  },
  Xathri: { 
    bonus: 'None', 
    effect: '+1m in forest, Population doesn\'t decrease until food is 2 less',
    applyBonus: async (player) => {
      // Effect is handled in daily update and movement
    }
  },
  Vampirian: { 
    bonus: 'None', 
    effect: 'Units gain +1 food when killing another unit',
    applyBonus: async (player) => {
      // Effect is handled in combat
    }
  },
  DarkElf: { 
    bonus: '+1 Medic level', 
    effect: '+1c on forest spaces',
    applyBonus: async (player) => {
      await player.update({ medicLevel: Math.min(6, player.medicLevel + 1) });
    }
  },
  Hobbit: { 
    bonus: '+1 Farmer & +1 Rogue level', 
    effect: 'None',
    applyBonus: async (player) => {
      await player.update({ 
        farmerLevel: Math.min(6, player.farmerLevel + 1),
        rogueLevel: Math.min(6, player.rogueLevel + 1)
      });
    }
  },
  Kappa: { 
    bonus: 'None', 
    effect: '+1c when attacked, Water movement costs 2m',
    applyBonus: async (player) => {
      // Effect is handled in combat and movement
    }
  },
  Avian: { 
    bonus: '+1 Architect level', 
    effect: 'Mountain movement costs 2m',
    applyBonus: async (player) => {
      await player.update({ architectLevel: Math.min(6, player.architectLevel + 1) });
    }
  }
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
      { c: 1, m: 5, produce: { item: 'gold', chances: [[1,20],[5,60],[10,20]] } },
      { c: 1, m: 7, produce: { item: 'gold', chances: [[2,20],[7,60],[13,20]] } },
      { c: 1, m: 8, produce: { item: 'gold', chances: [[3,20],[11,60],[16,20]] } },
      { c: 1, m: 9, produce: { item: 'gold', chances: [[4,20],[14,60],[19,20]] } },
      { c: 1, m: 10, produce: { item: 'gold', chances: [[5,20],[17,60],[21,20]] } },
      { c: 1, m: 11, produce: { item: 'gold', chances: [[7,20],[20,60],[25,20]] } }
    ]
  },
  Hunter: {
    emoji: '🐺',
    levels: [
      { c: 2, m: 7, produce: { item: 'food', chances: [[0,40],[1,55],[2,5]] } },
      { c: 2, m: 7, produce: { item: 'food', chances: [[0,35],[1,60],[2,5]] } },
      { c: 3, m: 8, produce: { item: 'food', chances: [[0,30],[1,60],[2,10]] } },
      { c: 3, m: 9, produce: { item: 'food', chances: [[0,25],[1,65],[2,10]] } },
      { c: 4, m: 9, produce: { item: 'food', chances: [[0,20],[1,65],[2,15]] } },
      { c: 5, m: 10, produce: { item: 'food', chances: [[0,15],[1,70],[2,15]] } }
    ]
  },
  Inventor: {
    emoji: '🔬',
    levels: [
      { c: 1, m: 4, produce: { item: 'trinket', chances: [[0,35],[1,65]] } },
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
      { c: 1, m: 5, produce: { item: 'medicine', chances: [[0,40],[1,55],[2,5]] } },
      { c: 1, m: 5, produce: { item: 'medicine', chances: [[0,30],[1,60],[2,10]] } },
      { c: 1, m: 6, produce: { item: 'medicine', chances: [[0,25],[1,65],[2,10]] } },
      { c: 1, m: 7, produce: { item: 'medicine', chances: [[0,20],[1,65],[2,15]] } },
      { c: 1, m: 8, produce: { item: 'medicine', chances: [[0,15],[1,70],[2,15]] } },
      { c: 1, m: 8, produce: { item: 'medicine', chances: [[1,85],[2,15]] } }
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
      { c: 1, m: 5, stealth: 1, bankTheftChance: 0.1 },
      { c: 1, m: 6, stealth: 2, bankTheftChance: 0.15 },
      { c: 2, m: 7, stealth: 3, bankTheftChance: 0.2 },
      { c: 2, m: 8, stealth: 4, bankTheftChance: 0.25 },
      { c: 3, m: 9, stealth: 5, bankTheftChance: 0.3 },
      { c: 3, m: 10, stealth: 6, bankTheftChance: 0.35 }
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
  ore: { buy: 10, sell: 5 },
  gem: { buy: 30, sell: 15 },
  trinket: { buy: 12, sell: 4 },
  weapon: { buy: (value) => Math.floor(value * 10), sell: (value) => Math.floor(value * 3) },
  beer_barrel: { buy: 15, sell: 5 },
  art: { buy: 25, sell: 5 },
  medicine: { buy: 25, sell: 5 }
};

const MONTHS = [
  'start of winter ❄', 'mid winter ❄', 'late winter ❄',
  'start of spring 🌺', 'mid spring 🌺', 'late spring 🌺',
  'start of summer 🌞', 'mid summer 🌞', 'late summer 🌞',
  'start of autumn 🍂', 'mid autumn 🍂', 'late autumn 🍂'
];


const EVENTS = [
  // ======================
  // NEGATIVE EVENTS (9 total)
  // ======================
  { 
    name: 'Crustacean Fury 🦀', 
    description: 'Gigantic crabs ravage the coastlines',
    effect: async (players) => {
      for (const player of players) {
        const coastalUnits = await Unit.findAll({ 
          where: { 
            PlayerId: player.playerId,
            position: 'coast'
          }
        });
        
        if (coastalUnits.length > 0) {
          const unitToDamage = coastalUnits[Math.floor(Math.random() * coastalUnits.length)];
          unitToDamage.combat -= 2;
          if (unitToDamage.combat <= 0) {
            await unitToDamage.destroy();
          } else {
            await unitToDamage.save();
          }
        }
      }
    },
    moodEffect: -1
  },
  { 
    name: 'Rat Infestation 🐀', 
    description: 'Giant rats have infested the grain stores',
    effect: async (players) => {
      for (const player of players) {
        const foodLost = Math.max(1, Math.floor(player.food * 0.3));
        await player.update({ 
          food: Math.max(0, player.food - foodLost) 
        });
      }
    },
    moodEffect: -1
  },
  { 
    name: 'Earthquake 🌍', 
    description: 'A massive earthquake shakes the land',
    effect: async (players) => {
      for (const player of players) {
        const units = await Unit.findAll({ 
          where: { PlayerId: player.playerId }
        });
        
        if (units.length > 0 && Math.random() < 0.3) {
          const unitToDestroy = units[Math.floor(Math.random() * units.length)];
          await unitToDestroy.destroy();
        }
      }
    },
    moodEffect: -2
  },
  // 🌟 NEW NEGATIVE EVENTS 🌟
  { 
    name: 'Bandit Raid 🏴‍☠️', 
    description: 'Marauders steal from your treasury',
    effect: async (players) => {
      for (const player of players) {
        const goldLost = Math.max(10, Math.floor(player.gold * 0.15));
        await player.update({ 
          gold: Math.max(0, player.gold - goldLost) 
        });
      }
    },
    moodEffect: -1
  },
  { 
    name: 'Plague Outbreak 🦠', 
    description: 'A mysterious illness spreads through your population',
    effect: async (players) => {
      for (const player of players) {
        await player.update({ 
          population: Math.max(1, player.population - 1),
          food: Math.max(0, player.food - 2) // Sick people consume more
        });
      }
    },
    moodEffect: -2
  },
  { 
    name: 'Drought ☀️', 
    description: 'A prolonged dry spell affects your farms',
    effect: async (players) => {
      for (const player of players) {
        const farmers = await Unit.count({
          where: {
            PlayerId: player.playerId,
            type: 'Farmer'
          }
        });
        // More farmers = better chance to mitigate
        if (farmers < 2 || Math.random() > farmers * 0.3) {
          await player.update({ 
            food: Math.max(0, player.food - 3) 
          });
        }
      }
    },
    moodEffect: -1
  },

  // ======================
  // POSITIVE EVENTS (9 total)
  // ======================
  { 
    name: 'Bountiful Harvest 🌾', 
    description: 'Excellent growing conditions have led to a bumper crop',
    effect: async (players) => {
      for (const player of players) {
        const bonusFood = player.population * (1 + Math.floor(Math.random() * 3));
        await player.update({ food: player.food + bonusFood });
      }
    },
    moodEffect: +1
  },
  { 
    name: 'Trade Boom 💰', 
    description: 'Merchants report excellent trading conditions',
    effect: async (players) => {
      for (const player of players) {
        const bonusGold = 10 + Math.floor(Math.random() * 20);
        await player.update({ gold: player.gold + bonusGold });
      }
    },
    moodEffect: +1
  },
  { 
    name: 'Ancient Discovery 🏺', 
    description: 'Your people have uncovered ancient artifacts',
    effect: async (players) => {
      for (const player of players) {
        await addToInventory(player.playerId, 'trinket', 1 + Math.floor(Math.random() * 2));
      }
    },
    moodEffect: +1
  },
  // 🌟 NEW POSITIVE EVENTS 🌟
  { 
    name: 'Friendly Dragons 🐉', 
    description: 'Dragons share their hoard with your kingdom',
    effect: async (players) => {
      for (const player of players) {
        if (player.race === 'Draconian') {
          // Double bonus for Draconians
          await player.update({ gold: player.gold + 50 });
        } else {
          await player.update({ gold: player.gold + 25 });
        }
      }
    },
    moodEffect: +2
  },
  { 
    name: 'Healing Spring 🛁', 
    description: 'A magical spring restores your units',
    effect: async (players) => {
      for (const player of players) {
        const units = await Unit.findAll({ 
          where: { PlayerId: player.playerId }
        });
        for (const unit of units) {
          const maxCombat = getUnitMaxCombat(unit, player);
          unit.combat = maxCombat;
          await unit.save();
        }
      }
    },
    moodEffect: +1
  },
  { 
    name: 'Skillful Year 📚', 
    description: 'Your people have made great advancements',
    effect: async (players) => {
      for (const player of players) {
        const skills = Object.keys(SKILLS);
        const randomSkill = skills[Math.floor(Math.random() * skills.length)];
        await addXP(player.playerId, randomSkill, 50);
      }
    },
    moodEffect: +1
  },

  // ======================
  // NEUTRAL/MIXED EVENTS (9 total)
  // ======================
  { 
    name: 'Mysterious Stranger 🎭', 
    description: 'A strange traveler visits your kingdom',
    effect: async (players) => {
      for (const player of players) {
        if (Math.random() > 0.5) {
          await player.update({ gold: player.gold + 15 });
        } else {
          await player.update({ gold: Math.max(0, player.gold - 10) });
        }
      }
    },
    moodEffect: 0
  },
  { 
    name: 'Wild Migration 🦌', 
    description: 'Large herds of animals pass through your lands',
    effect: async (players) => {
      for (const player of players) {
        const hunters = await Unit.count({
          where: {
            PlayerId: player.playerId,
            type: 'Hunter'
          }
        });
        if (hunters > 0) {
          await player.update({ food: player.food + hunters * 2 });
        }
      }
    },
    moodEffect: 0
  },
  // 🌟 NEW NEUTRAL EVENTS 🌟
  { 
    name: 'Market Fluctuations 📈', 
    description: 'Unusual market conditions affect prices',
    effect: async (players) => {
      // Temporarily modifies market prices
      for (const player of players) {
        if (Math.random() > 0.5) {
          player.marketBonus = 0.8; // 20% cheaper
        } else {
          player.marketBonus = 1.2; // 20% more expensive
        }
        await player.save();
      }
    },
    moodEffect: 0,
    duration: 24 // Hours until effect expires
  },
  { 
    name: 'Wandering Bard 🎶', 
    description: 'A traveling musician visits your kingdom',
    effect: async (players) => {
      for (const player of players) {
        if (player.mood < 3) {
          await player.update({ mood: player.mood + 1 });
        } else {
          // Already happy kingdoms get gold instead
          await player.update({ gold: player.gold + 5 });
        }
      }
    },
    moodEffect: 0
  },
  { 
    name: 'Strange Fog 🌫️', 
    description: 'An eerie fog blankets the land',
    effect: async (players) => {
      // Affects visibility and movement
      for (const player of players) {
        const rogues = await Unit.count({
          where: {
            PlayerId: player.playerId,
            type: 'Rogue'
          }
        });
        if (rogues < 1) {
          // Non-rogue kingdoms get movement penalty
          const units = await Unit.findAll({ 
            where: { PlayerId: player.playerId }
          });
          for (const unit of units) {
            unit.movement = Math.max(1, unit.movement - 1);
            await unit.save();
          }
        }
      }
    },
    moodEffect: 0
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
  medicineActive: { type: DataTypes.BOOLEAN, defaultValue: false },
  bankGold: { type: DataTypes.INTEGER, defaultValue: 0 } // New field for bank gold
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

async function getAverageSkillLevel(player) {
  const skills = Object.keys(SKILLS);
  let total = 0;
  for (const skill of skills) {
    total += player[`${skill.toLowerCase()}Level`];
  }
  return Math.round(total / skills.length);
}

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
  const roll = Math.random();
  let pool;
  
  if (roll < 0.4) pool = EVENTS.filter(e => e.moodEffect < 0); // 40% negative
  else if (roll < 0.8) pool = EVENTS.filter(e => e.moodEffect > 0); // 40% positive
  else pool = EVENTS.filter(e => e.moodEffect === 0); // 20% neutral

  return {
    ...pool[Math.floor(Math.random() * pool.length)],
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
        
        // Add XP for wandering (same as traveling)
        await addXP(unit.PlayerId, unit.type, 2);
        
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
        
        // Add XP for sailing (same as traveling)
        await addXP(unit.PlayerId, unit.type, 2);
        
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

function getUnitMaxCombat(unit, player) {
  const skillLevel = player[`${unit.type.toLowerCase()}Level`] || 1;
  const skillData = SKILLS[unit.type];
  if (!skillData || !skillData.levels[skillLevel - 1]) return 0;
  return skillData.levels[skillLevel - 1].c;
}

async function handleCombat(unit, enemyCR, enemyType) {
  const player = await Player.findByPk(unit.PlayerId);
  
  // Apply race bonuses
  let combatBonus = 0;
  if (player.race === 'Merfolk' && (unit.position === 'coast' || unit.position === 'water')) {
    combatBonus += 1;
  }
  if ((player.race === 'Elf' || player.race === 'Treefolk' || player.race === 'DarkElf') && unit.position === 'forest') {
    combatBonus += 1;
  }
  if (player.race === 'Kappa' && enemyType === 'monster') {
    combatBonus += 1;
  }
  
  // Get max combat and calculate effective CR
  const maxCombat = getUnitMaxCombat(unit, player);
  const unitCR = Math.min(unit.combat, maxCombat) + (unit.equippedWeapon || 0) + combatBonus;
  
  // Calculate win probability (unitCR / (unitCR + enemyCR))
  const winProbability = unitCR / (unitCR + enemyCR);
  const roll = Math.random();
  
  if (roll <= winProbability) {
    // Victory - take damage proportional to enemy strength
    const damage = enemyCR * 0.2 * (1 + Math.random() * 0.5); // 20-30% of enemy CR
    
    unit.combat = Math.max(1, unit.combat - damage);
    unit.combat = Math.min(unit.combat, maxCombat); // Enforce max combat
    
    await unit.save();
    return { 
      victory: true,
      damageDealt: damage.toFixed(2),
      winChance: (winProbability * 100).toFixed(1) + '%'
    };
  } else {
    // Defeat
    await unit.destroy();
    return { 
      victory: false,
      winChance: (winProbability * 100).toFixed(1) + '%'
    };
  }
}

function getMovementCost(from, to, unitType, race) {
  // Special movement costs based on terrain and unit type/race
  if (to === 'water' || to === 'coast') {
    return race === 'Merfolk' || race === 'Kappa' ? 2 : 3;
  }
  if (to === 'mountain') {
    return race === 'Avian' ? 2 : 3;
  }
  if (to === 'forest') {
    return race === 'Elf' || race === 'Treefolk' || race === 'Xathri' || race === 'DarkElf' ? 1 : 2;
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

    // Apply race bonuses
    await RACES[race].applyBonus(player);

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

    // Check unit type limit (max 3 of same type)
    const unitsOfType = await Unit.count({ 
      where: { 
        PlayerId: player.playerId,
        type: unitType
      }
    });
    if (unitsOfType >= 3) {
      return message.reply(`You can only have 3 ${unitType}s at a time`);
    }

    if (player.food < 3) {
      return message.reply('You need at least 3 food to train a unit');
    }

    const unitCount = await Unit.count({ where: { PlayerId: player.playerId } });
    if (unitCount >= 12) {
      return message.reply('You have reached the maximum of 12 units');
    }

    await player.update({ food: player.food - 3 });
    const unit = await createUnit(player.playerId, unitType);

    if (!unit) {
      await player.update({ food: player.food + 3 });
      return message.reply('Failed to create unit');
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

async function handleHotPotatoCommand(message) {
    try {
        const player = await Player.findByPk(message.author.id);
        if (!player) return message.reply('Use !setup first');

        const roll = Math.random() * 100; // Random number between 0-100
        let result;

        if (roll <= 90) { // 90% chance
            await player.increment('gold', { by: 1 });
            result = "You got :coin: gold!";
        } 
        else if (roll <= 96) { // 6% chance (90-96)
            await player.increment('gold', { by: 2 });
            result = "You got :coin: :coin: gold!";
        } 
        else if (roll <= 98) { // 2% chance (96-98)
            await player.increment('gold', { by: 5 });
            result = "You got :coin: :coin: :coin: :coin: :coin: gold! Jackpot!";
        } 
        else if (roll <= 99) { // 1% chance (98-99)
            await player.increment('gold', { by: 15 });
            result = "You got :coin: :coin: :coin: :coin: :coin: :coin: :coin: :coin: :coin: :coin: :coin: :coin: :coin: :coin: :coin: gold! JACKPOT!";
        } 
        else { // 1% chance (99-100)
            await player.update({ population: Math.max(1, player.population - 1) });
            result = "Oh no! The potato was too hot! You lost 1 population.";
        }

        const embed = new EmbedBuilder()
            .setTitle('🔥 Hot Potato Result 🔥')
            .setDescription(result)
            .addFields(
                { name: 'Current Gold', value: `${player.gold}g`, inline: true },
                { name: 'Current Population', value: player.population.toString(), inline: true }
            );

        message.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Hot Potato error:', error);
        message.reply('Error processing hot potato command');
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

    // Process taxes and bank redistribution
    let totalTaxes = 0;
    for (const player of players) {
      const tax = Math.floor(player.gold * 0.2);
      totalTaxes += tax;
      await player.update({ gold: player.gold - tax });
    }

    const bankCut = Math.floor(totalTaxes * 0.1);
    const redistribution = Math.floor((totalTaxes - bankCut) / players.length);
    
    // Update bank and redistribute
    for (const player of players) {
      await player.update({
        gold: player.gold + redistribution,
        bankGold: player.bankGold + bankCut
      });

      // Daily production attempts instead of free units
      for (const skill of [player.skill1, player.skill2]) {
        const skillData = SKILLS[skill];
        if (!skillData) continue;

        let produced = 0;
        let goldEarned = 0;

        for (let i = 0; i < 3; i++) { // 3 attempts
          if (skillData.levels[0].produce) {
            const roll = Math.random() * 100;
            for (const [amount, chance] of skillData.levels[0].produce.chances) {
              if (roll <= chance) {
                produced += amount;
                break;
              }
            }
          } else {
            goldEarned += 5; // 5g per attempt for non-producing skills
          }
        }

        if (produced > 0) {
          if (skillData.levels[0].produce.item === 'gold') {
            await player.update({ gold: player.gold + produced });
          } else {
            await addToInventory(player.playerId, skillData.levels[0].produce.item, produced);
          }
        }
        if (goldEarned > 0) {
          await player.update({ gold: player.gold + goldEarned });
        }
      }

      // Population changes
      let populationChange = 0;
      if (player.race === 'Goblin') {
        if (player.mood === 5) populationChange += 1;
        if (player.food > player.population - 4) populationChange += 1;
        if (player.mood === 1) populationChange -= 1;
        if (player.population > player.food + 4) populationChange -= 1;
      } else if (player.race === 'Xathri') {
        if (player.mood === 5) populationChange += 1;
        if (player.food > player.population - 2) populationChange += 1;
        if (player.mood === 1) populationChange -= 1;
        if (player.population > player.food + 2) populationChange -= 1;
      } else {
        if (player.mood === 5) populationChange += 1;
        if (player.food > player.population) populationChange += 1;
        if (player.mood === 1) populationChange -= 1;
        if (player.population > player.food) populationChange -= 1;
      }

      await player.update({
        population: Math.max(0, player.population + populationChange),
        food: Math.max(0, player.food - player.population)
      });
    }

    // Announcement
    const announcementChannel = bot.channels.cache.get(process.env.ANNOUNCEMENT_CHANNEL);
    if (announcementChannel) {
      const embed = new EmbedBuilder()
        .setTitle(`${date.day}th Day, ${date.month}`)
        .setDescription(event.isPublic 
          ? `Today's event: **${event.name}**\n${event.description}\n\n` +
            `Taxes collected and redistributed. Each kingdom received ${redistribution}g.`
          : 'Today\'s event is secret...\n\n' +
            `Taxes collected and redistributed. Each kingdom received ${redistribution}g.`)
        .setFooter({ text: 'All kingdoms have processed their daily production attempts' });

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

    const smith = player.Units.find(u => 
      u.type === 'Smith' && 
      (!u.lastAction || Date.now() - u.lastAction.getTime() > 15 * 60 * 1000) &&
      !u.isTraveling &&
      u.wanderingSpaces === 0 &&
      u.sailingSpaces === 0
    );
    
    if (!smith) return message.reply('No available smiths (must wait 15 minutes between actions or unit is traveling/wandering/sailing)');

    const levelData = SKILLS.Smith.levels[player.smithLevel - 1];
    
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
    
    // Create new item with unique ID
    await Inventory.create({
      itemId: `${itemType}_${Date.now()}`,
      PlayerId: player.playerId,
      itemType,
      quantity: 1,
      value: finalValue
    });
    
    if (oreUsed > 0) await removeFromInventory(player.playerId, 'ore', oreUsed);
    if (gemsUsed > 0) await removeFromInventory(player.playerId, 'gem', gemsUsed);
    
    await addXP(player.playerId, 'Smith', 12);
    smith.lastAction = new Date();
    await smith.save();
    
    message.reply(`Created ${itemType} with combat value: ${finalValue.toFixed(2)}`);
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

    if (args.length < 1) return message.reply('Usage: !wander <unitName> [spaces]');
    
    // Parse arguments - unit name could be multiple words
    let spaces = 10; // Default
    let unitNameParts = args;
    
    // Check if last argument is a number (spaces)
    if (!isNaN(parseInt(args[args.length - 1]))) {
      spaces = parseInt(args.pop());
      if (spaces <= 0) return message.reply('You must wander at least 1 space.');
      if (spaces > 100) return message.reply('You cannot wander more than 100 spaces at once.');
    }
    
    const unitName = unitNameParts.join(' ');
    if (!unitName) return message.reply('Specify a unit name to wander. Use !units to see your units.');

    const unit = player.Units.find(u => u.name.toLowerCase() === unitName.toLowerCase());
    if (!unit) return message.reply(`Unit "${unitName}" not found`);
    
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

    if (args.length < 1) return message.reply('Usage: !sail <unitName> [spaces]');
    
    // Parse arguments - unit name could be multiple words
    let spaces = 10; // Default
    let unitNameParts = args;
    
    // Check if last argument is a number (spaces)
    if (!isNaN(parseInt(args[args.length - 1]))) {
      spaces = parseInt(args.pop());
      if (spaces <= 0) return message.reply('You must sail at least 1 space.');
      if (spaces > 100) return message.reply('You cannot sail more than 100 spaces at once.');
    }
    
    const unitName = unitNameParts.join(' ');
    if (!unitName) return message.reply('Specify a unit name to sail. Use !units to see your units.');

    const unit = player.Units.find(u => u.name.toLowerCase() === unitName.toLowerCase());
    if (!unit) return message.reply(`Unit "${unitName}" not found`);
    
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
      include: [Unit, Inventory]
    });
    if (!player) return message.reply('Use !setup first');

    const itemType = args[0]?.toLowerCase();
    if (!itemType) return message.reply('Specify an item to use (medicine, etc.)');

    if (itemType === 'medicine') {
      const medicine = player.Inventories.find(i => i.itemType === 'medicine');
      if (!medicine || medicine.quantity < 1) {
        return message.reply("You don't have any medicine to use");
      }

      // Show unit list with current/max combat
      let unitList = player.Units.map((unit, index) => {
        const maxCombat = SKILLS[unit.type]?.levels[player[`${unit.type.toLowerCase()}Level`] - 1]?.c || 0;
        return `${index + 1}. ${unit.name} (${unit.type}) - Combat: ${unit.combat.toFixed(2)}/${maxCombat}`;
      }).join('\n');

      const prompt = await message.reply(
        `Which unit would you like to heal?\n${unitList}\n\nReply with the unit number or "cancel"`
      );

      const filter = m => m.author.id === message.author.id;
      const collected = await message.channel.awaitMessages({
        filter,
        max: 1,
        time: 30000,
        errors: ['time']
      });

      const response = collected.first().content.toLowerCase();
      if (response === 'cancel') return message.reply('Medicine use canceled.');

      const choice = parseInt(response) - 1;
      if (isNaN(choice) || choice < 0 || choice >= player.Units.length) {
        return message.reply('Invalid unit selection.');
      }

      const unit = player.Units[choice];
      const maxCombat = SKILLS[unit.type]?.levels[player[`${unit.type.toLowerCase()}Level`] - 1]?.c || 0;
      
      if (unit.combat >= maxCombat) {
        return message.reply(`This unit is already at maximum combat (${maxCombat}) for their skill level.`);
      }

      const newCombat = Math.min(maxCombat, unit.combat + 1);
      const healedAmount = newCombat - unit.combat;
      
      if (healedAmount <= 0) {
        return message.reply('This unit cannot be healed further.');
      }

      unit.combat = newCombat;
      await unit.save();
      await removeFromInventory(player.playerId, 'medicine', 1);
      
      return message.reply(`Healed ${unit.name} (+${healedAmount.toFixed(2)} combat)! Their combat is now ${unit.combat.toFixed(2)}/${maxCombat}`);
    }

    // [Rest of item handling...]
  } catch (error) {
    console.error('Item error:', error);
    message.reply('Error using item');
  }
}

function getUnitMaxCombat(unit, player) {
  const skillLevel = player[`${unit.type.toLowerCase()}Level`] || 1;
  const skillData = SKILLS[unit.type];
  if (!skillData || !skillData.levels[skillLevel - 1]) return 0;
  return skillData.levels[skillLevel - 1].c;
}

async function handleEquipCommand(message, args) {
  try {
    const player = await Player.findByPk(message.author.id, {
      include: [Unit, Inventory]
    });
    if (!player) return message.reply('Use !setup first');

    const unitName = args[0];
    if (!unitName) return message.reply('Specify a unit name to equip. Use !units to see your units.');

    const unit = player.Units.find(u => u.name.toLowerCase() === unitName.toLowerCase());
    if (!unit) return message.reply('Unit not found');

    const equipType = args[1]?.toLowerCase();
    if (!equipType || !['weapon', 'armor'].includes(equipType)) {
      return message.reply('Specify "weapon" or "armor" to equip');
    }

    const items = player.Inventories.filter(i => i.itemType === equipType);
    if (items.length === 0) {
      return message.reply(`You don't have any ${equipType}s to equip`);
    }

    // Sort by value (highest first)
    items.sort((a, b) => b.value - a.value);

    let itemList = items.map((item, index) => 
      `${index + 1}. ${item.itemType} (Value: ${item.value.toFixed(2)})`
    ).join('\n');

    const promptMessage = await message.reply(
      `Which ${equipType} would you like to equip?\n${itemList}\n\nReply with the number or "cancel"`
    );

    const filter = m => m.author.id === message.author.id;
    const collected = await message.channel.awaitMessages({
      filter,
      max: 1,
      time: 30000,
      errors: ['time']
    });
    
    const response = collected.first().content.toLowerCase();
    if (response === 'cancel') return message.reply('Equip canceled.');

    const choice = parseInt(response) - 1;
    if (isNaN(choice) || choice < 0 || choice >= items.length) {
      return message.reply('Invalid selection.');
    }

    const selectedItem = items[choice];
    
    if (equipType === 'weapon') {
      unit.equippedWeapon = selectedItem.value;
      await message.reply(`Equipped weapon with +${selectedItem.value.toFixed(2)} combat to ${unit.name}!`);
    } else {
      unit.equippedArmor = selectedItem.value;
      await message.reply(`Equipped armor with +${selectedItem.value.toFixed(2)} defense to ${unit.name}!`);
    }
    
    await unit.save();
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

    const unitName = args[0];
    const destination = args[args.length - 1]?.toLowerCase();

    if (!unitName || !destination) {
      return message.reply('Usage: !move <unitName> <destination> (market, mountain, forest, coast, capital)');
    }

    const validDestinations = ['market', 'mountain', 'forest', 'coast', 'capital'];
    if (!validDestinations.includes(destination)) {
      return message.reply('Invalid destination. Must be market, mountain, forest, coast, or capital');
    }

    const unit = player.Units.find(u => u.name.toLowerCase() === unitName.toLowerCase());
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
  // Special case for food - always add directly to player's food count
  if (itemType === 'food') {
    const player = await Player.findByPk(playerId);
    if (player) {
      await player.update({ food: player.food + quantity });
    }
    return;
  }

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
  // Special case for food - always remove directly from player's food count
  if (itemType === 'food') {
    const player = await Player.findByPk(playerId);
    if (player) {
      await player.update({ food: Math.max(0, player.food - quantity) });
    }
    return true;
  }

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

async function handleRollAllCommand(message, args) {
  try {
    console.log('Command received from', message.author.id);
    
    const player = await Player.findByPk(message.author.id, {
      include: [Unit, Inventory]
    });
    
    if (!player) {
      console.log('No player found');
      return await message.reply('Use !setup first');
    }

    console.log(`Found player with ${player.Units?.length} units`);
    
    const availableUnits = player.Units.filter(u => {
      const isAvailable = (!u.lastAction || Date.now() - u.lastAction.getTime() > 15 * 60 * 1000) &&
                         !u.isTraveling &&
                         u.wanderingSpaces === 0 &&
                         u.sailingSpaces === 0;
      console.log(`Unit ${u.name} available: ${isAvailable}`);
      return isAvailable;
    });

    console.log(`Available units: ${availableUnits.length}`);
    
    if (availableUnits.length === 0) {
      return await message.reply('No available units to perform actions. Units may be on cooldown, traveling, or occupied.');
    }

    let results = [];
    for (const unit of availableUnits) {
      try {
        console.log(`Processing unit ${unit.name} (${unit.type})`);
        let result = `${unit.name} (${unit.type}): `;
        let produced = 0;
        
        // Get the player's skill level for this unit type
        const skillLevel = player[`${unit.type.toLowerCase()}Level`] || 1;
        const skillData = SKILLS[unit.type];
        
        if (!skillData) {
          result += 'Unknown unit type';
          results.push(result);
          continue;
        }

        const levelData = skillData.levels[skillLevel - 1];
        
        if (!levelData) {
          result += 'Invalid skill level';
          results.push(result);
          continue;
        }

        if (unit.type === 'Smith') {
          const itemType = Math.random() < 0.5 ? 'weapon' : 'armor';
          
          if (Math.random() * 100 > levelData.produce.successRate) {
            result += 'Failed to create anything';
          } else {
            const baseValue = getRandomFloat(levelData.produce.minValue, levelData.produce.maxValue);
            await addToInventory(player.playerId, itemType, 1, baseValue);
            result += `Created ${itemType} with value ${baseValue.toFixed(2)}`;
            produced = 1;
          }
        } 
        else if (levelData.produce) {
          const roll = Math.random() * 100;
          produced = 0;

          for (const [amount, chance] of levelData.produce.chances) {
            if (roll <= chance) {
              produced = amount;
              break;
            }
          }

          if (produced > 0) {
            if (levelData.produce.item === 'gold') {
              await player.increment('gold', { by: produced });
              result += `Earned ${produced}g`;
            } else {
              await addToInventory(player.playerId, levelData.produce.item, produced);
              result += `Produced ${produced} ${levelData.produce.item}`;
            }
          } else {
            result += 'Produced nothing';
          }
        } else {
          result += 'No production ability';
        }

        unit.lastAction = new Date();
        await unit.save();
        results.push(result);
        console.log(`Unit ${unit.name} result: ${result}`);
        
        // Add XP for the action
        if (produced > 0) {
          await addXP(player.playerId, unit.type, 12); // Success XP
        } else {
          await addXP(player.playerId, unit.type, 16); // Failure XP (more for trying)
        }
      } catch (unitError) {
        console.error(`Error processing unit ${unit.name}:`, unitError);
        results.push(`${unit.name}: Error processing action`);
      }
    }

    console.log('Sending results to player');
    const embed = new EmbedBuilder()
      .setTitle('Roll All Results')
      .setDescription(results.join('\n'))
      .setFooter({ text: 'All available units have performed their actions' });
    
    await message.reply({ embeds: [embed] });
  } catch (error) {
    console.error('RollAll error:', error);
    try {
      await message.reply('Error processing rollall command');
    } catch (e) {
      console.error('Failed to send error message:', e);
    }
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

    let price;
    if (item === 'weapon' || item === 'armor') {
      const avgLevel = await getAverageSkillLevel(player);
      price = MARKET_PRICES[item].buy(avgLevel) * quantity;
    } else {
      price = MARKET_PRICES[item].buy * quantity;
    }

    if (player.gold < price) {
      return message.reply(`Not enough gold. You need ${price}g but only have ${player.gold}g`);
    }

    const merchantLevel = player.merchantLevel;
    const discount = merchantLevel * 0.05;
    const finalPrice = Math.floor(price * (1 - discount));

    await player.update({ gold: player.gold - finalPrice });
    
    if (item === 'food') {
      await player.update({ food: player.food + quantity });
    } else if (item === 'weapon' || item === 'armor') {
      const avgLevel = await getAverageSkillLevel(player);
      await addToInventory(player.playerId, item, quantity, avgLevel);
    } else {
      await addToInventory(player.playerId, item, quantity);
    }

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

    // Special handling for food - check player's food count
    if (item === 'food') {
      if (player.food < quantity) {
        return message.reply(`You don't have enough ${item} to sell`);
      }
      
      const price = MARKET_PRICES[item].sell * quantity;
      const merchantLevel = player.merchantLevel;
      const discount = merchantLevel * 0.05;
      const finalPrice = Math.floor(price * (1 + discount)); // Bonus when selling

      await player.update({ 
        gold: player.gold + finalPrice,
        food: player.food - quantity
      });
      
      return message.reply(`Sold ${quantity} ${item} for ${finalPrice}g${discount > 0 ? ` (${discount*100}% bonus applied)` : ''}`);
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

    const attackerName = args[0];
    const targetType = args[1]?.toLowerCase();
    const targetId = args[2];

    if (!attackerName || !targetType || !targetId) {
      return message.reply('Usage: !attack <attackerName> <unit|kingdom> <targetId>');
    }

    const attacker = player.Units.find(u => u.name.toLowerCase() === attackerName.toLowerCase());
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

async function handleRogueCommand(message, args) {
  const subCommand = args[0]?.toLowerCase();
  const player = await Player.findByPk(message.author.id, {
    include: [Unit]
  });

  if (!subCommand || !['infiltrate', 'heist'].includes(subCommand)) {
    return message.reply('Usage: `!rogue infiltrate <rogueName> <playerId>` OR `!rogue heist <rogueName>`');
  }

  const rogueName = args.slice(1, -1).join(' ');
  const rogue = player.Units.find(u => 
    u.type === 'Rogue' && 
    u.name.toLowerCase() === rogueName.toLowerCase()
  );

  if (!rogue) return message.reply('Rogue not found');
  if (rogue.isTraveling) return message.reply('Rogue is currently moving');

  const rogueLevel = SKILLS.Rogue.levels[player.rogueLevel - 1];

  if (subCommand === 'infiltrate') {
    const targetId = args[args.length - 1];
    const target = await Player.findByPk(targetId);
    if (!target) return message.reply('Target kingdom not found');

    // Infiltration logic
    const detectionChance = 0.3 - (rogueLevel.stealth * 0.1);
    
    if (Math.random() > detectionChance) {
      const stolenGold = Math.min(15, Math.floor(target.gold * 0.1));
      await target.update({ gold: target.gold - stolenGold });
      await player.update({ gold: player.gold + stolenGold });
      
      const targetUser = await bot.users.fetch(targetId);
      targetUser.send(`💸 A rogue stole ${stolenGold}g from your kingdom!`);
      
      message.reply(`Your rogue stole ${stolenGold}g successfully!`);
      await addXP(player.playerId, 'Rogue', 15);
    } else {
      message.reply('Your rogue was caught and killed!');
      await rogue.destroy();
      const targetUser = await bot.users.fetch(targetId);
      targetUser.send(`🕵️ A rogue from ${player.username}'s kingdom was caught!`);
    }
  } 
  else if (subCommand === 'heist') {
    // Bank heist logic
    const successChance = rogueLevel.bankTheftChance - 0.05;
    const totalBank = await Player.sum('bankGold');
    const heistAmount = Math.min(50, Math.floor(totalBank * 0.02));

    if (Math.random() < successChance) {
      const victims = await Player.findAll({ 
        where: { bankGold: { [Op.gt]: 0 } },
        order: sequelize.random(),
        limit: 3
      });
      
      let stolenTotal = 0;
      for (const victim of victims) {
        const stolen = Math.min(heistAmount, Math.floor(victim.bankGold * 0.3));
        await victim.update({ bankGold: victim.bankGold - stolen });
        stolenTotal += stolen;
        const victimUser = await bot.users.fetch(victim.playerId);
        victimUser.send(`🏦 The kingdom bank was robbed! Lost ${stolen}g from your taxes.`);
      }
      
      await player.update({ gold: player.gold + stolenTotal });
      message.reply(`💰 Bank heist successful! Stole ${stolenTotal}g.`);
      await addXP(player.playerId, 'Rogue', 25);
    } else {
      message.reply('🚨 Bank heist failed! Rogue executed and 30g fine imposed.');
      await rogue.destroy();
      await player.update({ gold: Math.max(0, player.gold - 30) });
      
      const announcementChannel = bot.channels.cache.get(process.env.ANNOUNCEMENT_CHANNEL);
      if (announcementChannel) {
        announcementChannel.send(
          `⚖️ ${player.username}'s rogue was executed for bank robbery! 30g fine imposed.`
        );
      }
    }
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
    else if (command === 'rogue') await handleRogueCommand(message, args);
    else if (command === 'item') await handleItemCommand(message, args);
    else if (command === 'equip') await handleEquipCommand(message, args);
    else if (command === 'rollall') await handleRollAllCommand(message, args);
    else if (command === 'hotpotato') await handleHotPotatoCommand(message, args);
    else if (command === 'yesireallywanttoresetmykingdom') await handleResetCommand(message);
    else if (command === 'commands') {
      message.reply(`
Available commands:
!setup - Create your kingdom
!status - View your kingdom status
!units - List all your units with details
!inventory - View your detailed inventory
!levels - View your skill levels and XP
!rollall - All your available units produce items
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
!move <unitName> <destination> - Move unit (market/mountain/forest/coast/capital)
!wander <unitName> [spaces] - Wander in forest (chance to encounter monsters)
!sail <unitName> [spaces] - Sail at coast (chance to find resources or encounter pirates)
!attack <unitName> <unit|kingdom> <targetId> - Attack
!item <item> - Use an item (trinket, beer_barrel, art, medicine, tea)
!equip <unitName> <weapon|armor> - Equip items to units
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
