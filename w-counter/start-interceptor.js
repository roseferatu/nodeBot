// Script to start the W counter message interceptor
require('dotenv').config();
const fs = require('fs');
const { spawn } = require('child_process');
const pidFile = './w-interceptor-pid.txt';

console.log('Starting W Counter Message Interceptor...');

// First check if there's an existing process
let existingPid = null;
try {
  if (fs.existsSync(pidFile)) {
    existingPid = parseInt(fs.readFileSync(pidFile, 'utf8').trim());
    console.log(`Found existing W Counter interceptor process (PID: ${existingPid}), attempting to terminate...`);
    
    try {
      // Try to kill the existing process
      process.kill(existingPid);
      console.log(`Terminated existing W Counter interceptor process with PID: ${existingPid}`);
    } catch (error) {
      // If we can't kill it, it probably doesn't exist anymore
      console.log(`No process with PID ${existingPid} was running, proceeding with startup`);
    }
  }
} catch (error) {
  console.error('Error checking existing process:', error);
}

// Start the bot with node
const interceptorProcess = spawn('node', ['interceptor.js'], {
  detached: true,
  stdio: 'inherit'
});

// Get the process ID and save it to the PID file
const pid = interceptorProcess.pid;
fs.writeFileSync(pidFile, `${pid}`);
console.log(`W Counter Message Interceptor started with PID: ${pid}`);

// Let it run independently of this process
interceptorProcess.unref();