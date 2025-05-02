// Script to register slash commands for the W Counter Bot
const { REST, Routes } = require('discord.js');
require('dotenv').config();

// Define commands
const commands = [
  {
    name: 'reset',
    description: 'Reset the W counter to zero with an animated mascot',
  },
  {
    name: 'count',
    description: 'Show the current W count with a playful animation',
  },
  {
    name: 'total',
    description: 'Show the total W count across all channels in the server',
  },
  {
    name: 'topservers',
    description: 'Show the top 10 servers with the most W\'s counted',
  },
  {
    name: 'mascot',
    description: 'Meet the W counter bot mascot with a special animation',
    options: [
      {
        name: 'style',
        description: 'Choose your preferred mascot style',
        type: 3, // STRING type
        required: false,
        choices: [
          {
            name: 'Happy',
            value: 'happy'
          },
          {
            name: 'Cool',
            value: 'cool'
          },
          {
            name: 'W Counter',
            value: 'w_counter'
          },
          {
            name: 'Default',
            value: 'default'
          }
        ]
      }
    ]
  },
];

// Create and configure REST instance
// Use W Counter specific tokens when available, fallback to regular tokens otherwise
const token = process.env.W_COUNTER_TOKEN || process.env.DISCORD_TOKEN;
const clientId = process.env.W_COUNTER_CLIENT_ID || process.env.CLIENT_ID;
const rest = new REST({ version: '10' }).setToken(token);

// Deploy commands function
async function deployCommands() {
  try {
    console.log('Started refreshing W Counter bot (/) commands.');
    console.log(`Using client ID: ${clientId.substring(0, 6)}...`);

    // The put method is used to fully refresh all commands
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    );

    console.log('Successfully reloaded W Counter bot (/) commands.');
  } catch (error) {
    console.error('Error deploying commands:', error);
  }
}

// Execute the function
deployCommands();