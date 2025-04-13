#!/usr/bin/env node

import { startMcpServer } from './server';
import config from './config/config';
import { authManager } from './upstox/auth';

/**
 * Check if a command-line flag is present
 */
function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

/**
 * Initialize logger to support MCP protocol over standard streams
 * 
 * This redirects normal console logs to stderr when running in MCP mode
 * so that stdout can be reserved for JSON-RPC messages.
 */
function initializeMcpLogger(): void {
  // Check if we're running in MCP mode (via Claude or another MCP client)
  const isMcpMode = process.env.MCP_STDOUT_ONLY === 'true';
  
  if (isMcpMode) {
    // Store original console methods
    const originalConsoleLog = console.log;
    const originalConsoleInfo = console.info;
    const originalConsoleWarn = console.warn;
    
    // Redirect console.log to stderr with a prefix
    console.log = (...args) => {
      console.error('[LOG]', ...args);
    };
    
    // Redirect console.info to stderr with a prefix
    console.info = (...args) => {
      console.error('[INFO]', ...args);
    };
    
    // Redirect console.warn to stderr with a prefix
    console.warn = (...args) => {
      console.error('[WARN]', ...args);
    };
    
    console.error('[INFO] MCP mode detected, redirecting logs to stderr');
  }
}

/**
 * Main entry point for the Upstox MCP server
 */
async function main() {
  try {
    // Initialize MCP logger first
    initializeMcpLogger();
    
    console.log('Starting Upstox MCP server...');
    
    // Determine if ngrok should be used
    const useNgrok = hasFlag('--use-ngrok');
    
    // Display configuration info
    console.log(`Server mode: ${config.upstox.environment}`);
    console.log(`Auth method: ${config.upstox.authMethod}`);
    console.log(`Redirect URI: ${config.upstox.redirectUri}`);
    console.log(`Tunnel enabled: ${useNgrok ? 'Yes' : 'No'}`);
    
    // Start the server with ngrok if requested
    const server = await startMcpServer({ useNgrok });
    
    // If not already authorized, show authorization URL
    if (!authManager.getAuthState().isAuthorized) {
      try {
        const authUrl = authManager.getAuthorizationUrl();
        console.log('\nAuthorization required. Please visit the following URL to authenticate:');
        console.log(authUrl);
        
        // Just show instructions for manually opening
        console.log('\nPlease open this URL in your browser to authenticate.');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('Unable to generate authorization URL:', errorMessage);
      }
    }
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down...');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\nShutting down...');
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to start server:', errorMessage);
    process.exit(1);
  }
}

// Run the application
main();
