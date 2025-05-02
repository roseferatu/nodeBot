// Custom script to run the W Counter bot with environment variables
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Execute deploy-commands.js first
console.log('Registering slash commands...');
const deployProcess = spawn('node', ['deploy-commands.js'], {
  env: {
    ...process.env,
    DISCORD_TOKEN: process.env.W_COUNTER_TOKEN,
    CLIENT_ID: process.env.W_COUNTER_CLIENT_ID
  }
});

deployProcess.stdout.on('data', (data) => {
  console.log(`deploy-commands: ${data}`);
});

deployProcess.stderr.on('data', (data) => {
  console.error(`deploy-commands error: ${data}`);
});

deployProcess.on('close', (code) => {
  console.log(`deploy-commands exited with code ${code}`);
  
  // After deploy-commands is done, start the bot
  console.log('Starting W Counter bot...');
  const botProcess = spawn('node', ['index.js'], {
    env: {
      ...process.env,
      DISCORD_TOKEN: process.env.W_COUNTER_TOKEN,
      CLIENT_ID: process.env.W_COUNTER_CLIENT_ID
    }
  });
  
  botProcess.stdout.on('data', (data) => {
    console.log(`W Counter bot: ${data}`);
  });
  
  botProcess.stderr.on('data', (data) => {
    console.error(`W Counter bot error: ${data}`);
  });
  
  botProcess.on('close', (code) => {
    console.log(`W Counter bot exited with code ${code}`);
  });
});