#!/usr/bin/env node

/**
 * Claude Desktop MCP Wrapper
 * 
 * This wrapper script is designed to run the Upstox MCP server in a way that's compatible
 * with Claude Desktop by isolating the stdout/stderr streams properly.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Path to the log file for debugging
const logFilePath = path.join(__dirname, 'claude-mcp-debug.log');

// Create a log file stream
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// Log function that writes to the log file
function log(message) {
  const timestamp = new Date().toISOString();
  logStream.write(`${timestamp} ${message}\n`);
}

// Override console.log to write to our log file only
const originalConsoleLog = console.log;
console.log = function(...args) {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  log(`CONSOLE: ${message}`);
};

// Override console.error to write to our log file only
const originalConsoleError = console.error;
console.error = function(...args) {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  log(`ERROR: ${message}`);
};

log('\n\n-------------- NEW SESSION --------------');
log(`Starting Claude wrapper at ${new Date().toISOString()}`);

// Determine if we're running from the built version or source
const isBuild = fs.existsSync(path.join(__dirname, 'dist', 'index.js'));
log(`Running in ${isBuild ? 'build' : 'source'} mode`);

// Set up the command to run
const command = isBuild 
  ? 'node'
  : 'npx';

const args = isBuild
  ? [path.join(__dirname, 'dist', 'index.js')]
  : ['ts-node', path.join(__dirname, 'src', 'index.ts')];

// Copy environment variables
const env = { ...process.env };

// Set MCP-specific environment variables
env.MCP_STDOUT_ONLY = 'true';
env.MCP_NO_CONSOLE_LOG = 'true';
env.MCP_TIMEOUT = '300000'; // 5 minutes timeout
env.NODE_ENV = 'production'; // Ensure production mode
env.MCP_TRANSPORT = 'stdio'; // Explicitly set transport mode

log(`Running command: ${command} ${args.join(' ')}`);

// Spawn the MCP server process
const mcpProcess = spawn(command, args, {
  env,
  stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
  detached: false // Keep attached to parent process
});

// Set up the readline interface for stdin
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Track last activity time
let lastActivityTime = Date.now();

// Update last activity time on any message
const updateActivityTime = () => {
  lastActivityTime = Date.now();
};

// Monitor MCP stdout for activity
mcpProcess.stdout.on('data', (data) => {
  try {
    const output = data.toString().trim();
    if (output) {
      // Write to both log file and stdout
      log(`MCP -> STDOUT: ${output}`);
      process.stdout.write(data);
      updateActivityTime();
    }
  } catch (error) {
    log(`Error handling stdout: ${error.message}`);
  }
});

// Handle stderr separately
mcpProcess.stderr.on('data', (data) => {
  try {
    const error = data.toString().trim();
    if (error) {
      // Only log stderr to the log file
      log(`MCP STDERR: ${error}`);
    }
  } catch (error) {
    log(`Error handling stderr: ${error.message}`);
  }
});

// Forward stdin lines to the MCP process
rl.on('line', (line) => {
  try {
    // Log incoming request
    log(`STDIN -> MCP: ${line}`);
    updateActivityTime();
    
    // Forward to MCP process with proper newline
    mcpProcess.stdin.write(line + '\n', 'utf8', (err) => {
      if (err) {
        log(`Error writing to MCP stdin: ${err.message}`);
      }
    });
  } catch (error) {
    log(`Error forwarding stdin: ${error.message}`);
  }
});

// Handle MCP process errors
mcpProcess.on('error', (err) => {
  log(`MCP process error: ${err.message}`);
  process.exit(1);
});

// Handle MCP process exit
mcpProcess.on('exit', (code, signal) => {
  log(`MCP process exited with code ${code} and signal ${signal}`);
  if (code !== 0) {
    log(`MCP process exited with error code ${code}`);
    process.exit(code);
  }
});

// Keep the process alive
process.stdin.resume();

// Handle wrapper process exit
process.on('exit', () => {
  log('Wrapper process exiting');
  try {
    mcpProcess.kill();
  } catch (err) {
    log(`Error killing MCP process: ${err.message}`);
  }
  logStream.end();
});

// Handle signals
process.on('SIGINT', () => {
  log('Received SIGINT');
  try {
    mcpProcess.kill('SIGINT');
  } catch (err) {
    log(`Error sending SIGINT to MCP process: ${err.message}`);
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM');
  try {
    mcpProcess.kill('SIGTERM');
  } catch (err) {
    log(`Error sending SIGTERM to MCP process: ${err.message}`);
  }
  process.exit(0);
});

// Handle process errors
process.on('uncaughtException', (err) => {
  log(`Uncaught exception: ${err.message}`);
  log(err.stack);
  try {
    mcpProcess.kill();
  } catch (killErr) {
    log(`Error killing MCP process during uncaught exception: ${killErr.message}`);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection: ${reason}`);
  try {
    mcpProcess.kill();
  } catch (killErr) {
    log(`Error killing MCP process during unhandled rejection: ${killErr.message}`);
  }
  process.exit(1);
});
