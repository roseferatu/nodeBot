// Run the W Counter bot forever, restarting it if it crashes
const { spawn } = require('child_process');
require('dotenv').config();

console.log('Starting W Counter bot with auto-restart capability...');

// Function to start the bot
function startBot() {
  console.log(`[${new Date().toISOString()}] Starting W Counter bot process...`);
  
  // Start the simplified bot with all console output captured
  const botProcess = spawn('node', ['simple-bot.js'], {
    stdio: 'inherit' // Inherit stdio to see all output
  });
  
  // Log process started
  console.log(`[${new Date().toISOString()}] W Counter bot started with PID: ${botProcess.pid}`);
  
  // Handle process exit
  botProcess.on('exit', (code, signal) => {
    console.log(`[${new Date().toISOString()}] W Counter bot process exited with code ${code} and signal ${signal}`);
    
    // Restart the bot after a short delay
    console.log(`[${new Date().toISOString()}] Restarting W Counter bot in 5 seconds...`);
    setTimeout(startBot, 5000);
  });
  
  // Handle process errors
  botProcess.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Failed to start W Counter bot: ${err.message}`);
    
    // Restart the bot after a short delay
    console.log(`[${new Date().toISOString()}] Attempting to restart W Counter bot in 10 seconds...`);
    setTimeout(startBot, 10000);
  });
}

// Start the bot initially
startBot();