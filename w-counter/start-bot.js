// Script to start the W Counter Bot with error handling and auto-restart
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure pid file directory exists
const pidFilePath = path.join(__dirname, '..', 'w-counter-pid.txt');

// Function to start the bot
function startBot() {
  console.log('Starting W Counter Bot...');
  
  // Check for existing PID file
  if (fs.existsSync(pidFilePath)) {
    try {
      const oldPid = parseInt(fs.readFileSync(pidFilePath, 'utf8').trim());
      if (oldPid) {
        console.log(`Found existing W Counter bot process (PID: ${oldPid}), attempting to terminate...`);
        try {
          process.kill(oldPid);
          console.log(`Successfully terminated previous process (PID: ${oldPid})`);
        } catch (killError) {
          console.log(`No process with PID ${oldPid} was running, proceeding with startup`);
        }
      }
    } catch (readError) {
      console.error('Error reading PID file:', readError);
    }
  }

  // Spawn the bot process
  const bot = spawn('node', [path.join(__dirname, 'index.js')], {
    stdio: 'inherit',
    detached: false
  });

  // Save PID to file for later cleanup
  fs.writeFileSync(pidFilePath, bot.pid.toString(), 'utf8');
  console.log(`W Counter Bot started with PID: ${bot.pid}`);

  // Handle bot process events
  bot.on('error', (error) => {
    console.error('W Counter Bot process error:', error);
    // Try to restart after a delay
    setTimeout(startBot, 5000);
  });

  bot.on('exit', (code, signal) => {
    console.log(`W Counter Bot process exited with code ${code} and signal ${signal}`);
    
    // Delete PID file on exit
    try {
      fs.unlinkSync(pidFilePath);
    } catch (error) {
      console.error('Error removing PID file:', error);
    }
    
    // Restart the bot if it crashes (but not if exit was intentional)
    if (code !== 0 && signal !== 'SIGTERM' && signal !== 'SIGINT') {
      console.log('W Counter Bot crashed, restarting in 5 seconds...');
      setTimeout(startBot, 5000);
    } else {
      console.log('W Counter Bot shut down gracefully.');
    }
  });

  // Handle parent process termination
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down W Counter Bot...');
    bot.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down W Counter Bot...');
    bot.kill('SIGTERM');
    process.exit(0);
  });

  // Deploy commands first
  const deployCommands = spawn('node', [path.join(__dirname, 'deploy-commands.js')], {
    stdio: 'inherit'
  });

  deployCommands.on('exit', (code) => {
    if (code === 0) {
      console.log('Slash commands deployed successfully for W Counter Bot');
    } else {
      console.error(`Failed to deploy commands (exit code: ${code})`);
    }
  });
}

// Start the bot
startBot();