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

log(`Running command: ${command} ${args.join(' ')}`);

// Spawn the MCP server process
const mcpProcess = spawn(command, args, {
  env,
  stdio: ['pipe', 'pipe', 'pipe'] // stdin, stdout, stderr
});

// Set up the readline interface for stdin
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Forward stdin lines to the MCP process
rl.on('line', (line) => {
  try {
    // Log incoming request
    log(`STDIN -> MCP: ${line}`);
    
    // Forward to MCP process
    mcpProcess.stdin.write(line + '\n');
  } catch (error) {
    log(`Error forwarding stdin: ${error.message}`);
  }
});

// Forward MCP stdout to our stdout
mcpProcess.stdout.on('data', (data) => {
  try {
    const output = data.toString().trim();
    if (output) {
      log(`MCP -> STDOUT: ${output}`);
      process.stdout.write(data);
    }
  } catch (error) {
    log(`Error forwarding stdout: ${error.message}`);
  }
});

// Log stderr to the debug file only
mcpProcess.stderr.on('data', (data) => {
  try {
    const error = data.toString().trim();
    if (error) {
      log(`MCP STDERR: ${error}`);
    }
  } catch (error) {
    log(`Error logging stderr: ${error.message}`);
  }
});

// Handle MCP process exit
mcpProcess.on('exit', (code, signal) => {
  log(`MCP process exited with code ${code} and signal ${signal}`);
  rl.close();
  logStream.end();
  process.exit(code || 0);
});

// Handle wrapper process exit
process.on('exit', () => {
  log('Wrapper process exiting');
  mcpProcess.kill();
  logStream.end();
});

// Handle signals
process.on('SIGINT', () => {
  log('Received SIGINT');
  mcpProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM');
  mcpProcess.kill('SIGTERM');
  process.exit(0);
});
